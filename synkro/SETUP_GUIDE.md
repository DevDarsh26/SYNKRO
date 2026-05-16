# Synkro Setup Guide

This guide will walk you through setting up the Synkro Code Security Scanner application from scratch.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- A GitHub account
- An IBM Cloud account
- A Firebase account

## Step 1: Install Dependencies

```bash
cd synkro
npm install
```

This will install all required packages including:
- Next.js 16
- React 19
- Firebase SDK
- IBM Watsonx AI SDK
- Octokit (GitHub API)
- Tailwind CSS
- shadcn/ui components

## Step 2: Set Up Firebase

### 2.1 Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "synkro-scanner")
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2.2 Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Enable "Google" sign-in method
   - Add your support email
   - Save

### 2.3 Create Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location (choose closest to your users)
5. Click "Enable"

### 2.4 Set Up Security Rules

In Firestore, go to "Rules" and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read/write scan results
    match /scans/{scanId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 2.5 Get Firebase Configuration

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (</>)
4. Register your app (name: "Synkro Web")
5. Copy the configuration object

## Step 3: Set Up IBM Watsonx AI

### 3.1 Create IBM Cloud Account

1. Go to [IBM Cloud](https://cloud.ibm.com/)
2. Sign up or log in
3. Verify your email

### 3.2 Create Watsonx AI Instance

1. In IBM Cloud dashboard, click "Catalog"
2. Search for "watsonx.ai"
3. Click on "watsonx.ai"
4. Select a plan (Lite plan available for testing)
5. Choose a region (e.g., Dallas)
6. Click "Create"

### 3.3 Get API Credentials

1. Go to your Watsonx AI instance
2. Click "Manage" in the left sidebar
3. Click "Access (IAM)"
4. Click "API keys"
5. Click "Create an IBM Cloud API key"
6. Name it "Synkro Scanner"
7. Copy and save the API key (you won't see it again!)

### 3.4 Get Project ID

1. In Watsonx AI, go to "Projects"
2. Create a new project or select existing
3. Copy the Project ID from the project settings

## Step 4: Set Up GitHub Personal Access Token

### 4.1 Generate Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" > "Generate new token (classic)"
3. Name: "Synkro Scanner"
4. Expiration: Choose your preference
5. Select scopes:
   - `repo` (if you want to scan private repos)
   - Or leave unchecked for public repos only
6. Click "Generate token"
7. Copy the token immediately (you won't see it again!)

**Note:** This token is for testing. Users will provide their own tokens when using the app.

## Step 5: Configure Environment Variables

### 5.1 Create .env.local File

In the `synkro` directory, create a file named `.env.local`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# IBM Watsonx Configuration
WATSONX_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5.2 Replace Placeholder Values

Replace all placeholder values with your actual credentials from Steps 2 and 3.

**Important:** Never commit `.env.local` to version control!

## Step 6: Run the Application

### 6.1 Start Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

### 6.2 Test the Application

1. Open http://localhost:3000 in your browser
2. Sign up with email/password or Google
3. Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`)
4. Provide your GitHub personal access token
5. Click "Start Security Scan"
6. Wait for the scan to complete
7. View the results

## Step 7: Production Deployment

### 7.1 Deploy to Vercel (Recommended)

1. Push your code to GitHub (without `.env.local`)
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard
5. Deploy

### 7.2 Environment Variables for Production

In Vercel (or your hosting platform), add all environment variables from `.env.local`, but update:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 7.3 Update Firebase Configuration

1. In Firebase Console, go to Authentication > Settings
2. Add your production domain to "Authorized domains"
3. Update OAuth redirect URIs if using Google Sign-In

## Troubleshooting

### Issue: "Firebase: Error (auth/unauthorized-domain)"

**Solution:** Add your domain to Firebase authorized domains:
1. Firebase Console > Authentication > Settings
2. Scroll to "Authorized domains"
3. Add your domain

### Issue: "Watsonx API authentication failed"

**Solution:** 
1. Verify your API key is correct
2. Check if your Watsonx instance is active
3. Ensure you're using the correct region URL

### Issue: "Failed to clone repository"

**Solution:**
1. Verify the GitHub URL is correct
2. Check if the repository is public or if your token has `repo` scope
3. Ensure your token hasn't expired

### Issue: "Module not found" errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Scan takes too long

**Solution:**
- Large repositories may take several minutes
- Consider implementing pagination or file limits
- Use a more powerful Watsonx plan for faster processing

## Security Best Practices

1. **Never commit secrets:**
   - Keep `.env.local` in `.gitignore`
   - Use environment variables for all sensitive data

2. **Rotate API keys regularly:**
   - Change GitHub tokens every 90 days
   - Rotate Firebase and Watsonx credentials periodically

3. **Use minimal permissions:**
   - GitHub tokens should have only necessary scopes
   - Firebase rules should restrict access appropriately

4. **Monitor usage:**
   - Check IBM Cloud usage to avoid unexpected charges
   - Monitor Firebase quotas

5. **Implement rate limiting:**
   - Add rate limits to API routes in production
   - Prevent abuse of scanning functionality

## Next Steps

- Customize the UI to match your brand
- Add more analysis rules
- Implement scan history in Firestore
- Add email notifications for scan completion
- Create a dashboard for scan statistics
- Add support for more programming languages

## Support

For issues or questions:
- Check the main README.md
- Review the code comments
- Open an issue on GitHub

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [IBM Watsonx Documentation](https://www.ibm.com/docs/en/watsonx-as-a-service)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)