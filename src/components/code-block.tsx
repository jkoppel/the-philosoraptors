import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"

export const CodeBlock = ({
  fileName,
  value,
}: {
  fileName: string
  value: string
}) => {
  const language = fileName.split(".")[1]
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          return match ? (
            <code className={className} {...props}>
              <SyntaxHighlighter language={language} style={oneLight}>
                {value}
              </SyntaxHighlighter>
            </code>
          ) : (
            <div>
              <code className={className} {...props}>
                {children}
              </code>
            </div>
          )
        },
      }}
    >
      {`\`\`\`${language} ${value} \`\`\``}
    </ReactMarkdown>
  )
}
