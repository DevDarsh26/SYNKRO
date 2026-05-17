# Synkro - AI-Powered Code Security Scanner

A Next.js web application that scans GitHub repositories for security vulnerabilities, code quality issues, performance problems, and testing gaps using IBM Watsonx AI.

## Features

✅ **Security Scanning**
- Detects SQL injection vulnerabilities
- Identifies XSS vulnerabilities
- Finds hardcoded secrets and API keys
- Checks for insecure dependencies

✅ **Code Quality Analysis**
- Identifies unused imports and dead code
- Detects code complexity issues
- Finds code smells and anti-patterns

✅ **Performance Analysis**
- Detects N+1 query problems
- Identifies memory leaks
- Finds inefficient algorithms

✅ **Testing Coverage**
- Identifies missing tests
- Finds untested code paths

✅ **Auto-Fix Suggestions**
- AI-generated code fixes
- Detailed recommendations
- One-click fix application

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **AI Analysis**: IBM Watsonx AI
- **GitHub Integration**: Octokit, simple-git

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd synkro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# IBM Watsonx Configuration
WATSONX_API_KEY=your_watsonx_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password and Google)
4. Enable Firestore Database
5. Copy your configuration to `.env.local`

### 5. Set Up IBM Watsonx

1. Go to [IBM Cloud](https://cloud.ibm.com/)
2. Create a Watsonx AI instance
3. Get your API key and Project ID
4. Add them to `.env.local`

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Sign In / Sign Up

- Create an account or sign in with email/password
- Or use Google Sign-In

### 2. Scan a Repository

- Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`)
- Provide your GitHub Personal Access Token
  - Generate one at: https://github.com/settings/tokens
  - Required scopes: `repo` (for private repos) or none (for public repos)
- Click "Start Security Scan"

### 3. View Results

- Wait for the scan to complete (progress bar shows status)
- View all detected issues categorized by:
  - Type (Security, Quality, Performance, Testing, Dependency)
  - Severity (Critical, High, Medium, Low)
- Filter issues by type and severity

### 4. Fix Issues

- Expand any issue to see:
  - Detailed description
  - Problematic code snippet
  - Suggested fix
  - Recommendations
- Click "Apply Fix" to see the AI-generated fix
- Use "Auto-Fix All" to process multiple issues

## Project Structure

```
synkro/
├── app/
│   ├── api/
│   │   ├── scan/route.js      # Repository scanning endpoint
│   │   ├── status/route.js    # Scan status endpoint
│   │   └── fix/route.js       # Code fix generation endpoint
│   ├── layout.js              # Root layout
│   ├── page.js                # Main page
│   └── globals.css            # Global styles
├── components/
│   ├── Auth/
│   │   ├── AuthProvider.jsx   # Firebase auth context
│   │   └── LoginForm.jsx      # Login/signup form
│   ├── Scanner/
│   │   └── ScannerForm.jsx    # Repository input form
│   ├── Results/
│   │   └── ResultsView.jsx    # Scan results display
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── github/
│   │   └── clone.js           # GitHub repo cloning
│   ├── watsonx/
│   │   └── client.js          # IBM Watsonx AI client
│   └── utils.js               # Utility functions
├── config/
│   └── firebase.js            # Firebase configuration
└── public/                    # Static assets
```

## API Endpoints

### POST /api/scan
Start a new repository scan.

**Request:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "githubToken": "ghp_xxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "scanId": "scan_1234567890_abc123",
  "status": "started",
  "message": "Scan started successfully"
}
```

### GET /api/scan?scanId={scanId}
Get scan status and results.

**Response:**
```json
{
  "status": "completed",
  "progress": 100,
  "message": "Scan completed successfully",
  "results": [...],
  "repository": {
    "owner": "owner",
    "repo": "repo"
  }
}
```

### POST /api/fix
Generate a fix for an issue.

**Request:**
```json
{
  "issue": {...},
  "fullCode": "..."
}
```

**Response:**
```json
{
  "success": true,
  "fixedCode": "...",
  "issue": {...}
}
```

## Security Notes

- Never commit your `.env.local` file
- Keep your GitHub tokens secure
- Use tokens with minimal required permissions
- Regularly rotate your API keys

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions, please open an issue on GitHub.
