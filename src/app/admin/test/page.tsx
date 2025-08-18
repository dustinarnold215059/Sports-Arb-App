'use client';

import Link from 'next/link';
import { ModernButton } from "../../../shared/components/ui/ModernButton";
import { ModernCard, ModernCardHeader, ModernCardBody } from "../../../shared/components/ui/ModernCard";

export default function AdminTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <ModernCard variant="glass">
          <ModernCardHeader>
            <h1 className="text-2xl font-bold text-white">🧪 Admin Navigation Test</h1>
            <p className="text-gray-300">Test different admin routes to debug navigation issues</p>
          </ModernCardHeader>
          <ModernCardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Admin Routes</h2>
                
                <Link href="/admin">
                  <ModernButton variant="primary" fullWidth>
                    🛡️ Main Admin Dashboard
                  </ModernButton>
                </Link>
                
                <Link href="/admin/database">
                  <ModernButton variant="secondary" fullWidth>
                    🗄️ Database Admin
                  </ModernButton>
                </Link>
                
                <Link href="/admin/test">
                  <ModernButton variant="ghost" fullWidth>
                    🧪 This Test Page
                  </ModernButton>
                </Link>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Navigation Info</h2>
                
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-300">
                    <strong>Current URL:</strong> 
                    <span className="text-blue-400 ml-1" id="current-url">Loading...</span>
                  </p>
                  
                  <p className="text-sm text-gray-300">
                    <strong>User Agent:</strong>
                    <span className="text-green-400 ml-1 text-xs" id="user-agent">Loading...</span>
                  </p>
                  
                  <p className="text-sm text-gray-300">
                    <strong>Local Storage:</strong>
                    <span className="text-yellow-400 ml-1" id="local-storage">Checking...</span>
                  </p>
                </div>
                
                <Link href="/">
                  <ModernButton variant="error" fullWidth>
                    ← Back to Home
                  </ModernButton>
                </Link>
              </div>
              
            </div>
          </ModernCardBody>
        </ModernCard>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            // Update current URL
            document.getElementById('current-url').textContent = window.location.href;
            
            // Update user agent
            document.getElementById('user-agent').textContent = navigator.userAgent;
            
            // Check local storage
            try {
              const keys = Object.keys(localStorage);
              document.getElementById('local-storage').textContent = keys.length + ' keys found';
            } catch (e) {
              document.getElementById('local-storage').textContent = 'Error accessing localStorage';
            }
          });
        `
      }} />
    </div>
  );
}