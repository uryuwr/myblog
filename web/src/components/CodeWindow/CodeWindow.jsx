import './CodeWindow.css';

export default function CodeWindow({ title = 'code.ts', children, language = 'typescript' }) {
  return (
    <div className="code-window">
      <div className="code-header">
        <div className="window-controls">
          <span className="control red"></span>
          <span className="control yellow"></span>
          <span className="control green"></span>
        </div>
        <span className="file-name">{title}</span>
      </div>
      <div className="code-body">
        <pre className="code-content">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}
