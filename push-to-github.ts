import { getUncachableGitHubClient } from './server/github-client';

async function pushToGitHub() {
  try {
    console.log('Getting GitHub client...');
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    // Check if SchoolVault repository exists
    const repoName = 'SchoolVault';
    console.log(`Checking if repository exists: ${repoName}...`);
    
    let repoExists = false;
    try {
      const { data: repo } = await octokit.repos.get({
        owner: user.login,
        repo: repoName,
      });
      console.log(`Repository already exists: ${repo.html_url}`);
      repoExists = true;
    } catch (error: any) {
      if (error.status === 404) {
        console.log('Repository does not exist. Creating it...');
      } else {
        throw error;
      }
    }
    
    // Create repository if it doesn't exist
    if (!repoExists) {
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'SchoolVault - Mobile app for digitizing and organizing school documents with OCR, built with React Native and Expo',
        private: false,
        auto_init: false,
      });
      console.log(`Repository created: ${repo.html_url}`);
    }
    
    const repoUrl = `https://github.com/${user.login}/${repoName}`;
    console.log(`\n✅ Repository ready: ${repoUrl}`);
    console.log(`\nTo push your code, run these commands in the Shell:`);
    console.log(`\ngit remote remove origin 2>/dev/null || true`);
    console.log(`git remote add origin ${repoUrl}.git`);
    console.log(`git branch -M main`);
    console.log(`git push -u origin main\n`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

pushToGitHub();
