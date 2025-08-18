'use client';

import { useState } from 'react';
import { Input, Button, Card, Alert } from '../../shared/components/ui';

export default function TestInputsPage() {
  const [values, setValues] = useState({
    email: '',
    password: '',
    username: '',
    amount: ''
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          🧪 Input Testing Page
        </h1>
        
        <Alert 
          variant="info" 
          title="Test Input Responsiveness"
          description="Type in these fields to verify they show your input in real-time"
          className="mb-8"
        />

        <Card padding="lg">
          <div className="space-y-6">
            <Input
              label="Email"
              type="email"
              value={values.email}
              onChange={handleChange('email')}
              placeholder="Type your email here..."
            />
            
            <Input
              label="Password"
              type="password"
              value={values.password}
              onChange={handleChange('password')}
              placeholder="Type your password here..."
            />
            
            <Input
              label="Username"
              value={values.username}
              onChange={handleChange('username')}
              placeholder="Type your username here..."
            />
            
            <Input
              label="Amount"
              type="number"
              value={values.amount}
              onChange={handleChange('amount')}
              placeholder="Type an amount here..."
            />

            <Button fullWidth>
              Submit Test
            </Button>
          </div>
        </Card>

        <Card padding="lg" className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Current Values:
          </h3>
          <div className="space-y-2 text-sm">
            <div><strong>Email:</strong> "{values.email}"</div>
            <div><strong>Password:</strong> "{values.password}"</div>
            <div><strong>Username:</strong> "{values.username}"</div>
            <div><strong>Amount:</strong> "{values.amount}"</div>
          </div>
        </Card>
      </div>
    </div>
  );
}