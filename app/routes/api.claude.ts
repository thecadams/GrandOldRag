import { ActionFunction, json } from "@remix-run/node";
import Anthropic from '@anthropic-ai/sdk';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// SQLite database connection helper
async function getDb() {
  return open({
    filename: path.join(process.cwd(), 'afl.sqlite3'),
    driver: sqlite3.Database
  });
}

// Tool to get database schema
async function getSchema() {
  const db = await getDb();
  const tables = await db.all(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `);

  let schema: { [key: string]: { name: string; type: string; }[] } = {};
  for (const table of tables) {
    const columns = await db.all(`PRAGMA table_info(${table.name})`);
    schema[table.name] = columns.map(col => ({
      name: col.name,
      type: col.type
    }));
  }
  await db.close();
  return schema;
}

// Tool to run read-only queries
async function runQuery(query: string) {
  if (!query.trim().toLowerCase().startsWith('select')) {
    throw new Error('Only SELECT queries are allowed');
  }

  const db = await getDb();
  const result = await db.all(query);
  await db.close();
  return JSON.stringify(result);
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { input } = await request.json();
    const schema = await getSchema();

    const systemPrompt = `You are a helpful, informative expert on AFL players, games, teams, and history. 
You have access to an AFL database through the runQuery tool. When using this tool, you must provide a valid SQL SELECT query.

Here is the database schema: ${JSON.stringify(schema, null, 2)}

When answering questions about AFL data:
1. Always formulate a proper SQL SELECT query
2. Use the runQuery tool with a "query" parameter containing your SQL query
3. Wait for the results before providing your final answer
4. Base your response on the actual query results

Example tool use:
{
  "query": "SELECT * FROM teams LIMIT 5"
}`;

    const tools = [{
      name: 'runQuery',
      description: 'Run a read-only SQL query against the AFL database. You must provide a query parameter with a valid SQL SELECT statement.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL SELECT query to execute'
          }
        },
        required: ['query']
      }
    }];

    let currentMessages = [{ role: 'user', content: input }];
    let hasToolUses = true;
    let finalContent = [];

    while (hasToolUses) {
      console.log('🔄 Making call with messages:', currentMessages);
      currentMessages.map(m => console.log('📧 Message content:', m.content));
      currentMessages.map(m => { if (m.content.type === 'tool_result') console.log('📧 Tool result value:', m.content.value) });

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        messages: currentMessages,
        system: systemPrompt,
        tools
      });

      console.log('🔍 Response:', response);

      // Check for tool uses in the response
      const toolUses = response.content.filter(c => c.type === 'tool_use');
      hasToolUses = toolUses.length > 0;

      if (hasToolUses) {
        // Process all tool uses
        for (const toolUse of toolUses) {
          console.log('🛠️ Claude invoking tool:', toolUse);

          let result = null;
          if (toolUse.name === 'runQuery' && toolUse.input?.query) {
            try {
              const query = toolUse.input.query;
              console.log('📥 Running query:', query);
              result = await runQuery(query);
              console.log('📤 Query result:', result);
            } catch (error) {
              console.error('❌ Query error:', error);
              result = { error: 'Query failed to execute' };
            }
          }

          // Add the tool use and result to the conversation
          currentMessages.push(
            {
              role: 'assistant',
              content: [{
                type: 'tool_use',
                id: toolUse.id,
                name: toolUse.name,
                input: toolUse.input
              }]
            },
            {
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result
              }]
            }
          );
        }
      } else {
        // No more tool uses, add the final response content
        finalContent = response.content;
      }
    }

    console.log('📤 Returning final response with all processed content');
    return json({ content: finalContent });

  } catch (error) {
    console.error("❌ Error:", error);
    return json({ error: `Error processing your request: ${error}` }, { status: 500 });
  }
};
