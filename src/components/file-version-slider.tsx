import React, { useState } from "react"
import { CodeBlock } from "./code-block"

interface FileVersionSliderProps {
  filePath: string
  versions: string[]
}

export const FileVersionSlider: React.FC<FileVersionSliderProps> = ({
  filePath,
  versions,
}) => {
  const [currentVersion, setCurrentVersion] = useState(0)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 w-full">
        <label
          htmlFor="version-slider"
          className="block text-sm font-medium text-gray-700 mb-2 text-center"
        >
          File Version
        </label>
        <div className="relative">
          <input
            type="range"
            id="version-slider"
            min="0"
            max={versions.length - 1}
            value={currentVersion}
            onChange={(e) => setCurrentVersion(parseInt(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          {versions.map((_, index) => (
            <span key={index}>{index}</span>
          ))}
        </div>
      </div>
      <CodeBlock fileName={filePath} value={versions[currentVersion]} />
    </div>
  )
}
