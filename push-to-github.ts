import { getUncachableGitHubClient } from './server/github-client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function pushToGitHub() {
  try {
    console.log('Getting GitHub client...');
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    // Create repository
    const repoName = 'schoolvault';
    console.log(`Creating repository: ${repoName}...`);
    
    try {
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'SchoolVault - Mobile app for digitizing and organizing school documents with OCR, built with React Native and Expo',
        private: false,
        auto_init: false,
      });
      console.log(`Repository created: ${repo.html_url}`);
      console.log(`Clone URL: ${repo.clone_url}`);
      
      // Add git remote
      try {
        execSync('git remote remove origin', { stdio: 'ignore' });
      } catch (e) {
        // Ignore if remote doesn't exist
      }
      
      const remoteUrl = `https://${user.login}:${await getAccessToken()}@github.com/${user.login}/${repoName}.git`;
      execSync(`git remote add origin ${remoteUrl}`);
      console.log('Git remote added');
      
      // Push to GitHub
      console.log('Pushing to GitHub...');
      execSync('git push -u origin main', { stdio: 'inherit' });
      console.log('\n✅ Successfully pushed to GitHub!');
      console.log(`🔗 Repository URL: ${repo.html_url}`);
      
    } catch (error: any) {
      if (error.status === 422) {
        console.log('Repository already exists. Updating remote and pushing...');
        
        try {
          execSync('git remote remove origin', { stdio: 'ignore' });
        } catch (e) {
          // Ignore
        }
        
        const remoteUrl = `https://${user.login}:${await getAccessToken()}@github.com/${user.login}/${repoName}.git`;
        execSync(`git remote add origin ${remoteUrl}`);
        
        execSync('git push -u origin main --force', { stdio: 'inherit' });
        console.log('\n✅ Successfully pushed to GitHub!');
        console.log(`🔗 Repository URL: https://github.com/${user.login}/${repoName}`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    process.exit(1);
  }
}

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  const connectionSettings = data.items?.[0];
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  
  if (!accessToken) {
    throw new Error('GitHub access token not found');
  }
  
  return accessToken;
}

pushToGitHub();
