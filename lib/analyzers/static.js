/**
 * Built-in static code analyzer that works without external AI APIs.
 * Provides pattern-based security, quality, and performance analysis.
 */

const SECURITY_PATTERNS = [
  {
    pattern: new RegExp('eval\\s*\\(', 'g'),
    title: 'Dangerous use of eval()',
    description: 'Using eval() can execute arbitrary code and is a major security risk. It can lead to code injection attacks.',
    severity: 'critical',
    type: 'security',
    fix: 'Replace eval() with safer alternatives like JSON.parse() for data parsing, or Function constructor for controlled execution.',
    recommendation: 'Never use eval() with user-supplied input. Use JSON.parse() for JSON data, or template literals for string construction.',
  },
  {
    pattern: new RegExp('innerHTML\\s*=', 'g'),
    title: 'Potential XSS via innerHTML',
    description: 'Setting innerHTML directly can lead to Cross-Site Scripting (XSS) attacks if the content contains user input.',
    severity: 'high',
    type: 'security',
    fix: 'Use textContent instead of innerHTML, or use a DOM sanitization library like DOMPurify.',
    recommendation: 'Always sanitize HTML content before inserting into the DOM. Use textContent for text-only content.',
  },
  {
    pattern: new RegExp('document\\.write\\s*\\(', 'g'),
    title: 'Use of document.write()',
    description: 'document.write() can overwrite the entire document and is considered a security risk.',
    severity: 'high',
    type: 'security',
    fix: 'Use DOM manipulation methods like appendChild(), insertAdjacentHTML(), or framework-specific rendering.',
    recommendation: 'Avoid document.write() entirely. Use modern DOM APIs for content manipulation.',
  },
  {
    pattern: new RegExp('(password|secret|api[_-]?key|token|auth)\\s*[:=]\\s*[\'"][^\'"]{4,}[\'"]', 'gi'),
    title: 'Potential hardcoded secret or credential',
    description: 'Hardcoded secrets, passwords, or API keys in source code pose a significant security risk if the code is shared or committed to version control.',
    severity: 'critical',
    type: 'security',
    fix: 'Move secrets to environment variables (.env files) and access them via process.env.',
    recommendation: 'Use environment variables or a secrets management service. Never commit credentials to version control.',
  },
  {
    pattern: new RegExp('https?:\\/\\/[^\\s\'"]+', 'g'),
    check: (match) => match.startsWith('http://') && !match.includes('localhost') && !match.includes('127.0.0.1'),
    title: 'Insecure HTTP URL detected',
    description: 'Using HTTP instead of HTTPS can expose data to man-in-the-middle attacks.',
    severity: 'medium',
    type: 'security',
    fix: 'Replace http:// with https:// for all external URLs.',
    recommendation: 'Always use HTTPS for external communications to ensure data encryption in transit.',
  },
  {
    pattern: new RegExp('new\\s+Function\\s*\\(', 'g'),
    title: 'Dynamic function creation with Function constructor',
    description: 'Creating functions dynamically using the Function constructor can be exploited similarly to eval().',
    severity: 'high',
    type: 'security',
    fix: 'Use static function declarations or arrow functions instead of dynamically creating functions.',
    recommendation: 'Avoid the Function constructor. Define functions statically whenever possible.',
  },
  {
    pattern: new RegExp('SELECT\\s+.*\\s+FROM\\s+.*\\+\\s*[\'"`]', 'gi'),
    title: 'Potential SQL injection vulnerability',
    description: 'String concatenation in SQL queries can lead to SQL injection attacks.',
    severity: 'critical',
    type: 'security',
    fix: 'Use parameterized queries or an ORM to prevent SQL injection.',
    recommendation: 'Always use parameterized queries, prepared statements, or an ORM for database operations.',
  },
  {
    pattern: new RegExp('\\$\\{[^}]*\\}\\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)', 'gi'),
    title: 'Template literal in SQL query',
    description: 'Using template literals in SQL queries without proper sanitization can lead to SQL injection.',
    severity: 'critical',
    type: 'security',
    fix: 'Use parameterized queries instead of template literals for SQL operations.',
    recommendation: 'Never interpolate user input directly into SQL queries.',
  },
  {
    pattern: new RegExp('cors\\(\\s*\\)', 'g'),
    title: 'CORS enabled with default settings',
    description: 'Using CORS with default settings allows requests from any origin, which can be a security risk.',
    severity: 'medium',
    type: 'security',
    fix: 'Configure CORS with specific allowed origins: cors({ origin: ["https://yourdomain.com"] })',
    recommendation: 'Always restrict CORS to specific trusted origins in production.',
  },
  {
    pattern: new RegExp('dangerouslySetInnerHTML', 'g'),
    title: 'Usage of dangerouslySetInnerHTML',
    description: 'Bypasses Reacts XSS protection and can expose the application to Cross-Site Scripting (XSS).',
    severity: 'high',
    type: 'security',
    fix: 'Use standard React children rendering or heavily sanitize the input with DOMPurify.',
    recommendation: 'Avoid dangerouslySetInnerHTML unless absolutely necessary and the input is fully sanitized.',
  },
  {
    pattern: new RegExp('Math\\.random\\s*\\(', 'g'),
    title: 'Insecure randomness (Math.random)',
    description: 'Math.random() is not cryptographically secure and should not be used for tokens, passwords, or secure identifiers.',
    severity: 'medium',
    type: 'security',
    fix: 'Use crypto.getRandomValues() in the browser or the crypto module in Node.js.',
    recommendation: 'Always use a cryptographically secure pseudo-random number generator (CSPRNG) for sensitive data.',
  },
  {
    pattern: new RegExp('Buffer\\.allocUnsafe\\s*\\(', 'g'),
    title: 'Unsafe Buffer allocation',
    description: 'Buffer.allocUnsafe() can expose uninitialized memory which may contain sensitive data.',
    severity: 'high',
    type: 'security',
    fix: 'Use Buffer.alloc() instead to zero-fill the memory, or explicitly fill the buffer after allocation.',
    recommendation: 'Default to Buffer.alloc() for memory safety unless performance is critical and memory is explicitly overwritten.',
  }
];

const QUALITY_PATTERNS = [
  {
    pattern: new RegExp('console\\.(log|debug|info|warn|error)\\s*\\(', 'g'),
    title: 'Console statement left in code',
    description: 'Console statements should be removed from production code. They can expose sensitive information and affect performance.',
    severity: 'low',
    type: 'quality',
    fix: 'Remove console statements or use a proper logging library with configurable log levels.',
    recommendation: 'Use a logging library like winston or pino with environment-based log levels.',
  },
  {
    pattern: new RegExp('TODO|FIXME|HACK|XXX|TEMP', 'g'),
    title: 'Unresolved code comment',
    description: 'Code contains TODO/FIXME/HACK comments indicating incomplete or temporary code that needs attention.',
    severity: 'low',
    type: 'quality',
    fix: 'Address the TODO/FIXME comment or create a tracked issue for it.',
    recommendation: 'Track code TODOs in your issue tracker and resolve them before merging to production.',
  },
  {
    pattern: new RegExp('catch\\s*\\([^)]*\\)\\s*\\{\\s*\\}', 'g'),
    title: 'Empty catch block',
    description: 'Empty catch blocks silently swallow errors, making debugging extremely difficult.',
    severity: 'medium',
    type: 'quality',
    fix: 'Log the error or handle it appropriately in the catch block.',
    recommendation: 'Always handle errors in catch blocks. At minimum, log the error for debugging.',
  },
  {
    pattern: new RegExp('var\\s+\\w+', 'g'),
    title: 'Use of "var" keyword',
    description: 'The "var" keyword has function-scoping issues. Modern JavaScript should use "let" or "const".',
    severity: 'low',
    type: 'quality',
    fix: 'Replace "var" with "const" for constants and "let" for variables that need reassignment.',
    recommendation: 'Always use "const" by default, and "let" only when reassignment is needed.',
  },
  {
    pattern: new RegExp('==(?!=)', 'g'),
    exclude: new RegExp('===|!==|==='),
    title: 'Loose equality comparison (==)',
    description: 'Loose equality (==) performs type coercion which can lead to unexpected behavior.',
    severity: 'low',
    type: 'quality',
    fix: 'Use strict equality (===) instead of loose equality (==).',
    recommendation: 'Always use strict equality (===) and strict inequality (!==) to avoid type coercion bugs.',
  },
  {
    pattern: new RegExp('function\\s+\\w+\\s*\\([^)]{80,}\\)', 'g'),
    title: 'Function with too many parameters',
    description: 'Functions with many parameters are hard to understand and maintain. Consider using an options object.',
    severity: 'medium',
    type: 'quality',
    fix: 'Refactor to use a single options/config object parameter.',
    recommendation: 'Limit functions to 3-4 parameters. Use destructured objects for more parameters.',
  },
];

const PERFORMANCE_PATTERNS = [
  {
    pattern: new RegExp('\\.forEach\\s*\\(', 'g'),
    nearby: new RegExp('await\\s+'),
    title: 'Async operations inside forEach',
    description: 'Using async/await inside forEach does not properly handle async operations. Promises run concurrently without waiting.',
    severity: 'medium',
    type: 'performance',
    fix: 'Use a for...of loop for sequential async operations, or Promise.all() for parallel execution.',
    recommendation: 'Use for...of with await for sequential, or map() + Promise.all() for parallel async operations.',
  },
  {
    pattern: new RegExp('JSON\\.parse\\s*\\(.*JSON\\.stringify', 'g'),
    title: 'Deep clone via JSON parse/stringify',
    description: 'Using JSON.parse(JSON.stringify()) for deep cloning is slow and loses functions, dates, and undefined values.',
    severity: 'low',
    type: 'performance',
    fix: 'Use structuredClone() or a library like lodash.cloneDeep() for deep cloning.',
    recommendation: 'Use structuredClone() (modern browsers) or a dedicated deep clone utility.',
  },
  {
    pattern: new RegExp('new\\s+RegExp\\s*\\(', 'g'),
    title: 'Dynamic RegExp creation in potential loop',
    description: 'Creating RegExp objects dynamically inside loops or frequently-called functions wastes resources.',
    severity: 'low',
    type: 'performance',
    fix: 'Define RegExp patterns as constants outside the function or loop.',
    recommendation: 'Create RegExp objects once and reuse them. Store them as module-level constants when possible.',
  },
  {
    pattern: new RegExp('document\\.querySelector(All)?\\s*\\(', 'g'),
    title: 'Frequent DOM querying',
    description: 'Repeated DOM queries can be expensive. Cache DOM references when possible.',
    severity: 'low',
    type: 'performance',
    fix: 'Cache the DOM query result in a variable and reuse it.',
    recommendation: 'Store DOM element references in variables to avoid repeated querySelector calls.',
  },
];

const DEPENDENCY_PATTERNS = [
  {
    pattern: new RegExp('require\\s*\\(\\s*[\'"]child_process[\'"]\\s*\\)', 'g'),
    title: 'Use of child_process module',
    description: 'The child_process module can execute arbitrary system commands. Ensure inputs are properly sanitized.',
    severity: 'high',
    type: 'dependency',
    fix: 'Validate and sanitize all inputs before passing to child_process. Consider using a safer alternative.',
    recommendation: 'Avoid child_process where possible. When necessary, whitelist allowed commands and sanitize all inputs.',
  },
  {
    pattern: new RegExp('require\\s*\\(\\s*[\'"]fs[\'"]\\s*\\)', 'g'),
    title: 'Direct file system access',
    description: 'Direct file system operations should be carefully controlled to prevent path traversal attacks.',
    severity: 'medium',
    type: 'dependency',
    fix: 'Validate file paths and use path.resolve() to prevent path traversal. Restrict to known directories.',
    recommendation: 'Always validate and sanitize file paths. Use allowlists for permitted directories.',
  },
];

/**
 * Analyze a code file using built-in pattern matching.
 */
export function analyzeFileStatic(content, fileName) {
  const issues = [];
  const lines = content.split('\n');
  const allPatterns = [
    ...SECURITY_PATTERNS,
    ...QUALITY_PATTERNS,
    ...PERFORMANCE_PATTERNS,
    ...DEPENDENCY_PATTERNS,
  ];

  for (const rule of allPatterns) {
    let match;
    const regex = rule.pattern;
    regex.lastIndex = 0; // reset regex state

    while ((match = regex.exec(content)) !== null) {
      // Optional custom check
      if (rule.check && !rule.check(match[0])) continue;

      // Calculate line number
      const upToMatch = content.substring(0, match.index);
      const lineNumber = upToMatch.split('\n').length;

      // Get the code context (3 lines around the match)
      const startLine = Math.max(0, lineNumber - 2);
      const endLine = Math.min(lines.length, lineNumber + 1);
      const codeContext = lines.slice(startLine, endLine).join('\n');

      issues.push({
        type: rule.type,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        line: lineNumber,
        code: codeContext,
        fix: rule.fix,
        recommendation: rule.recommendation,
        file: fileName,
      });

      // Don't find too many of the same issue
      if (issues.filter(i => i.title === rule.title).length >= 5) break;
    }
  }

  return issues;
}

/**
 * Analyze package.json for dependency issues via static checks and OSV API.
 */
export async function analyzePackageJson(content, fileName) {
  const issues = [];

  try {
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const packagesToCheck = [];

    for (const [name, version] of Object.entries(deps)) {
      // Static Checks
      if (version === '*' || version === 'latest') {
        issues.push({
          type: 'dependency',
          severity: 'high',
          title: `Unpinned dependency: ${name}`,
          description: `The dependency "${name}" uses "${version}" which can lead to unexpected breaking changes.`,
          line: null,
          code: `"${name}": "${version}"`,
          fix: `Pin the dependency to a specific version: "${name}": "^x.y.z"`,
          recommendation: 'Always pin dependencies to specific versions or ranges to ensure reproducible builds.',
          file: fileName,
        });
      }

      if (name === 'event-stream' || name === 'flatmap-stream') {
        issues.push({
          type: 'security',
          severity: 'critical',
          title: `Known malicious package: ${name}`,
          description: `The package "${name}" was compromised and contained malicious code.`,
          line: null,
          code: `"${name}": "${version}"`,
          fix: `Remove "${name}" and find a safe alternative.`,
          recommendation: 'Run npm audit regularly and remove any flagged packages.',
          file: fileName,
        });
      }

      // Collect for OSV
      // Clean version string (remove ^, ~, >=)
      const cleanVersion = version.replace(/^[^\d]+/, '');
      if (cleanVersion && cleanVersion.match(/^\d+\.\d+\.\d+/)) {
        packagesToCheck.push({ name, version: cleanVersion });
      }
    }

    // OSV API Batch Lookup (up to 50 for speed)
    if (packagesToCheck.length > 0) {
      const batch = packagesToCheck.slice(0, 50).map(p => ({
        package: { name: p.name, ecosystem: 'npm' },
        version: p.version
      }));

      try {
        const response = await fetch('https://api.osv.dev/v1/querybatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries: batch }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.results) {
            for (const [index, res] of data.results.entries()) {
              if (res.vulns && res.vulns.length > 0) {
                const pkgInfo = packagesToCheck[index];
                const severity = res.vulns.some(v => v.database_specific?.severity === 'CRITICAL' || v.database_specific?.severity === 'HIGH') ? 'critical' : 'high';
                
                issues.push({
                  type: 'security',
                  severity,
                  title: `Vulnerable package: ${pkgInfo.name}@${pkgInfo.version}`,
                  description: `OSV detected ${res.vulns.length} known vulnerability/vulnerabilities in this package version. Top ID: ${res.vulns[0].id}`,
                  line: null,
                  code: `"${pkgInfo.name}": "${pkgInfo.version}"`,
                  fix: `Update ${pkgInfo.name} to a secure version.`,
                  recommendation: 'Review the CVE details on osv.dev and upgrade the package to the patched version.',
                  file: fileName,
                });
              }
            }
          }
        }
      } catch {
        // OSV API lookup failed — non-critical, skip silently
      }
    }
  } catch (e) {
    // Not valid JSON, skip
  }

  return issues;
}
