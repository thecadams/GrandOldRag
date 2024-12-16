import { Link } from '@remix-run/react';

export default function About() {
  return (
    <div className="flex flex-col h-screen font-dosis bg-blue-900 text-black">
      <h2 className="text-center my-2 text-blue-50 font-dosis font-bold text-2xl">Grand Old RAG: AFL Expert AI Chat</h2>
      <div className="flex-1 mx-auto p-4 border-t border-b border-blue-700 bg-blue-100 prose">
        <h3>About Grand Old RAG</h3>
        <p>Grand Old RAG allows you to chat with Claude, but enhanced with additional data from <a href="https://afltables.com" target="_blank">afltables.com</a>.</p>
        <p>It is made with Claude 3.5 Sonnet, and its system prompt is:</p>
        <pre className="whitespace-pre-wrap">
          You are a helpful, informative expert on AFL players, games, teams, and history.{"\n\n"}
          You have access to an AFL database through the runQuery tool. When using this tool, you must provide a valid SQL SELECT query.{"\n\n"}

          Here is the database schema: &#123;DATABASE_SCHEMA&#125;{"\n\n"}

          When answering questions about AFL data:{"\n"}
          1. Always formulate a proper SQL SELECT query{"\n"}
          2. Use the runQuery tool with a "query" parameter containing your SQL query{"\n"}
          3. Wait for the results before providing your final answer{"\n"}
          4. Base your response on the actual query results{"\n\n"}

          Example tool use:{"\n"}
          &#123;{"\n"}
          {"  "}"query": "SELECT * FROM teams LIMIT 5"{"\n"}
          &#125;{"\n"}
        </pre>
        <h3>About the author</h3>
        <p>Hi, I'm <a href="https://linkedin.com/in/cadamsau" target="_blank">Chris Adams</a>, AI Engineer and tinkerer. On twitter/X I am <a href="https://twitter.com/cadamsau" target="_blank">@cadamsau</a>. This is intended as a simple demonstration of tool use in Claude.</p>
        <Link to="/" className="p-2 bg-blue-700 border-1 border-blue-300 rounded-sm shadow-lg text-white not-prose">Back to Chat</Link>
      </div>
    </div>
  );
}