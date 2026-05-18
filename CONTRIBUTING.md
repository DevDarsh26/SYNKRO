# Contributing to SYNKRO

First off, thank you for considering contributing to SYNKRO! We appreciate the time and effort you spend to make this project better for everyone.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please treat all maintainers, contributors, and community members with respect.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

*   **Use a clear and descriptive title** for the issue.
*   **Describe the exact steps** which reproduce the problem.
*   **Provide specific examples** to demonstrate the steps.
*   **Describe the behavior** you observed and explain why it is a bug.
*   **Explain the expected behavior**.
*   **Include screenshots** if applicable.

### Suggesting Enhancements

If you have an idea to improve SYNKRO, we want to hear about it! Please submit an issue providing:

*   **A clear title** and description of the proposed feature.
*   **The rationale** behind the feature (e.g., what problem it solves).
*   **Possible implementation** ideas, if you have any.

### Pull Requests

We actively welcome your pull requests.

1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  If you've changed APIs, update the documentation.
4.  Ensure the test suite passes (run `npm run test` or `npm run lint`).
5.  Make sure your code adheres to our standard style (check with `npm run lint`).
6.  Issue that pull request!

## Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/synkro.git
    cd synkro
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    Copy `.env.example` to `.env.local` and add your required keys (e.g., `GEMINI_API_KEY`, `WATSONX_API_KEY`, `NEXT_PUBLIC_FIREBASE_API_KEY`).

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architectural Guidelines

*   **Security First:** Since this is a security tool, code must be thoroughly scrutinized for vulnerabilities.
*   **Performance:** Keep the bundle size small and ensure fast API responses.
*   **Logging:** Use `lib/logger.js` instead of `console.log`.
*   **AI Integrations:** When adding new AI providers, follow the established pattern in `lib/gemini/client.js` or `lib/watsonx/client.js`.

Thank you for contributing!
