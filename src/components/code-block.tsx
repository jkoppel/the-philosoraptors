import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"

export const CodeBlock = ({
  className,
  fileName,
  value,
}: {
  className?: string
  fileName: string
  value: string
}) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])
  if (!isClient) {
    return null
  }

  const language = fileName.split(".")[1]
  return (
    <ReactMarkdown
      className={className}
      components={{
        code({ className, ...props }) {
          return (
            <code className={className} {...props}>
              <SyntaxHighlighter language={language} style={oneLight}>
                {value}
              </SyntaxHighlighter>
            </code>
          )
        },
      }}
    >
      {`\`\`\`${language} ${value} \`\`\``}
    </ReactMarkdown>
  )
}
