import React, { useState } from 'react';
import { Button, Input, Text, Heading } from '@magicui/react';
import { motion } from 'framer-motion';
import './App.css';

function App() {
  const [repoUrl, setRepoUrl] = useState('');

  const mockData = [
    { text: "Main repository structure", importance: "high" },
    { text: "Core functionality in src/core", importance: "medium" },
    { text: "API routes defined in api/", importance: "medium" },
    { text: "React components in components/", importance: "high" },
    { text: "Utility functions in utils/", importance: "low" },
    { text: "Test suite in __tests__/", importance: "medium" },
    { text: "Configuration files in root directory", importance: "low" },
    { text: "Documentation in docs/", importance: "medium" },
    { text: "Build scripts in scripts/", importance: "low" },
    { text: "Third-party integrations in integrations/", importance: "medium" },
  ];

  const getStyleForImportance = (importance) => {
    switch (importance) {
      case 'high':
        return 'text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500';
      case 'medium':
        return 'text-xl font-semibold bg-gradient-to-r from-blue-500 to-teal-500';
      case 'low':
        return 'text-lg font-medium bg-gradient-to-r from-green-500 to-yellow-500';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <Heading level={1} className="text-5xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        Learn How Any Github Repo Works!
      </Heading>
      
      <div className="flex justify-center mb-12">
        <Input
          type="text"
          placeholder="Please enter a Github URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-96 mr-4"
        />
        <Button variant="primary" size="lg">
          Learn Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`p-6 rounded-lg shadow-lg ${getStyleForImportance(item.importance)}`}
          >
            <Text className="text-white">{item.text}</Text>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default App;
