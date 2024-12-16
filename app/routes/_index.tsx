import { useState, useEffect, FormEvent, useRef } from 'react';
import { Link } from '@remix-run/react';
import ReactMarkdown from 'react-markdown';

class Message {
  role!: string;
  content!: string;
}

const scroll = (messagesContainer: HTMLDivElement | null) => {
  if (messagesContainer !== null) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

export default function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>()
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, []);

  useEffect(() => {
    scroll(messagesContainerRef.current);
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    let newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    localStorage.setItem('chatMessages', JSON.stringify(newMessages));
    const previousInput = input;
    setInput('');

    setIsLoading(true);
    scroll(messagesContainerRef.current);
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });

      if (response.ok) {
        const { content } = await response.json();
        if (content.length === 0) {
          throw new Error(`Error calling API! Got no messages in response from model. status: ${response.status}, body: ${await response.text()}`);
        }
        const { text } = content[0];
        newMessages = [...newMessages, { role: 'assistant', content: text }]
        setMessages(newMessages);
        localStorage.setItem('chatMessages', JSON.stringify(newMessages));
      } else {
        throw Error(`Error calling API! status: ${response.status}, body: ${await response.text()}`);
      }
    } catch (error) {
      let errorMessage = String(error);
      if (error instanceof Error) errorMessage = error.message;
      setError(errorMessage);
      setInput(previousInput);
    } finally {
      localStorage.setItem('chatMessages', JSON.stringify(newMessages));
      setIsLoading(false);
      scroll(messagesContainerRef.current);
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh)] font-dosis bg-blue-900 text-white">
      <h2 className="text-center my-2 text-blue-50 font-dosis font-bold text-2xl">Grand Old RAG</h2>
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 border-t border-b border-blue-700 bg-blue-100 pb-10">
        <div className="sticky mb-4 flex w-full justify-between">
          <button onClick={clearChat} className="flex-start p-2 bg-blue-700 border-1 border-blue-300 rounded-sm shadow-lg">Clear</button>
          <Link to="/about" className="flex-end p-2 bg-blue-700 border-1 border-blue-300 rounded-sm shadow-lg">About</Link>
        </div>
        {messages.map((message, index) => (
          <div key={index} className="flex flex-col mb-4">
            <div className={`max-w-[70%] p-2 px-4 rounded-lg mb-2 text-base border-2 border-blue-700 shadow-md ${message.role === 'assistant' ? 'self-start bg-white text-black' : 'self-end bg-blue-50 text-black'}`}>
              <ReactMarkdown className="prose prose-sm max-w-none">
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col mb-4">
            <div className="max-w-[70%] p-2 px-4 rounded-lg mb-2 text-base border-2 border-blue-700 shadow-md self-start bg-white text-black">
              ...
            </div>
          </div>
        )}
        {!!error && (
          <div className="flex flex-col mb-4">
            <div className="max-w-[70%] p-2 px-4 rounded-lg mb-2 text-base border-2 border-blue-700 shadow-md self-start bg-white text-black">
              Error: {error}. Please try again.
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="fixed bottom-0 w-full flex items-center p-2 border-t border-saddle-brown">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-blue-100 rounded-lg mr-2 text-base font-dosis text-black"
        />
        <button type="submit" className="px-4 py-2 rounded-lg text-base cursor-pointer font-dosis bg-blue-700">Send</button>
      </form>
    </div>
  );
}