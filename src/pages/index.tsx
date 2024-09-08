import Image from "next/image"
import localFont from "next/font/local"
import BlurIn from "@/components/magicui/blur-in"
import { useState, useEffect } from "react"
import { FileDependencyMap } from "@/backend/types"
import { motion, AnimatePresence } from "framer-motion"
import ShimmerButton from "@/components/magicui/shimmer-button"
import Graph from "@/components/graph"
import { sampleModuleGraph } from "@/lib/samples"
import { FileVersionSlider } from "@/components/file-version-slider"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})

export default function Home() {
  const [repoId, setRepoId] = useState<number | null>(1)
  const demoFilePath = "packages/pglite/src/worker/index.ts"
  const [demoFileContent, setDemoFileContent] = useState<string | null>(null)
  const [codeLevels, setCodeLevels] = useState<string[] | null>(null)
  const [graph, setGraph] = useState<FileDependencyMap | null>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const [knowledgeLevel, setKnowledgeLevel] = useState(0)
  const [activeRepo, setActiveRepo] = useState("")
  const [showContent, setShowContent] = useState(false)

  const repoOptions = [
    { name: "pglite", url: "https://github.com/electric-sql/pglite" },
    { name: "PyTorch", url: "https://github.com/pytorch/pytorch" },
    { name: "NumPy", url: "https://github.com/numpy/numpy" },
    { name: "React", url: "https://github.com/facebook/react" },
    { name: "Supabase", url: "https://github.com/supabase/supabase" },
  ]

  const handleCloneRepo = async (repoUrl: string) => {
    try {
      const response = await fetch("/api/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl: `${repoUrl}.git`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to clone repository")
      }

      const data = await response.json()
      setRepoId(data.id)
    } catch (error) {
      console.error("Error cloning repository:", error)
    }
  }

  const fetchCodeLevels = async (content: string) => {
    try {
      const response = await fetch("/api/summarized-code-levels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceCode: content }),
      })
      console.log("response", response)
      if (!response.ok) {
        throw new Error("Failed to fetch code levels")
      }
      const data = await response.json()
      return data.codeLevels
    } catch (error) {
      console.error("Error fetching code levels:", error)
      return []
    }
  }

  const fetchFileContent = async () => {
    try {
      const response = await fetch(`/api/repos/${repoId}/files/${demoFilePath}`)
      if (!response.ok) {
        throw new Error("Failed to fetch file content")
      }
      const data = await response.json()
      setDemoFileContent(data.content)

      const codeLevels = await fetchCodeLevels(data.content)
      setCodeLevels(codeLevels)
    } catch (error) {
      console.error("Error fetching file content:", error)
      setDemoFileContent("Error: Failed to fetch file content")
    }
  }

  const fetchGraph = async (id: number) => {
    try {
      const response = await fetch(`/api/repos/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch graph")
      }
      const data = await response.json()
      setGraph(data.files)
    } catch (error) {
      console.error("Error fetching graph:", error)
    }
  }
  useEffect(() => {
    fetchFileContent()
  }, [])

  useEffect(() => {
    if (repoId) {
      fetchGraph(repoId)
    }
  }, [repoId])

  const mockData = [
    { text: "Main repository structure", importance: "high" },
    { text: "Core functionality in src/core", importance: "medium" },
    { text: "API routes defined in api/", importance: "medium" },
    { text: "React components in components/", importance: "high" },
    { text: "Utility functions in utils/", importance: "low" },
    { text: "Test suite in __tests__/", importance: "medium" },
    { text: "Configuration files in root directory", importance: "low" },
    { text: "Documentation in docs/", importance: "medium" },
    { text: "Build scripts in scripts/", importance: "low" },
    { text: "Third-party integrations in integrations/", importance: "medium" },
  ]

  const getStyleForImportance = (importance: string) => {
    switch (importance) {
      case "high":
        return "text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500"
      case "medium":
        return "text-xl font-semibold bg-gradient-to-r from-blue-500 to-teal-500"
      case "low":
        return "text-lg font-medium bg-gradient-to-r from-green-500 to-yellow-500"
      default:
        return ""
    }
  }

  const handleRepoButtonClick = (url: string, name: string) => {
    setRepoUrl(url)
    setActiveRepo(name)
  }

  const handleLearnNowClick = () => {
    setShowContent(true)
  }

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-b from-green-50 to-green-900 py-8 px-4 sm:px-8 font-[family-name:var(--font-geist-sans)]`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-end justify-center mb-12">
          <div className="mb-6 sm:mb-0 sm:mr-8">
            <Image
              src="/dino.png"
              alt="Rex the Dino"
              width={400}
              height={400}
              className="w-100 h-100 sm:w-50 sm:h-50 object-contain"
            />
          </div>
          <BlurIn
            word="Learn any Github repo with Rex!"
            className="text-3xl sm:text-4xl font-bold text-green-800 dark:text-green-200 text-center sm:text-left"
          />
        </div>

        <div className="p-6">
          <div className="mb-8 w-64 mx-auto">
            <label
              htmlFor="knowledge-slider"
              className="block text-sm font-medium text-gray-700 mb-2 text-center"
            >
              Your Knowledge Level of this Repo
            </label>
            <div className="relative">
              <input
                type="range"
                id="knowledge-slider"
                min="0"
                max="5"
                value={knowledgeLevel}
                onChange={(e) => setKnowledgeLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center space-x-2 sm:space-x-4 mb-6">
            {repoOptions.map((repo) => (
              <button
                key={repo.name}
                onClick={() => handleRepoButtonClick(repo.url, repo.name)}
                className={`px-3 py-1 text-sm rounded-full mb-2 ${
                  activeRepo === repo.name
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-800 hover:bg-green-100"
                } transition duration-300`}
              >
                {repo.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center">
            <input
              type="text"
              placeholder="Please enter a Github URL"
              value={repoUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRepoUrl(e.target.value)
              }
              className="w-full sm:w-96 mb-4 sm:mb-0 sm:mr-4 px-4 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <ShimmerButton
              className="shadow-2xl bg-green-600 hover:bg-green-700"
              onClick={handleLearnNowClick}
            >
              <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white">
                Learn Now
              </span>
            </ShimmerButton>
          </div>
        </div>

        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-12 text-center space-y-6">
                <h2 className="text-2xl font-bold text-green-800 mb-4">
                  Unlock the Power of Code Analysis
                </h2>
                <p className="text-md text-gray-700">
                  Discover the inner workings of any GitHub repository with our
                  advanced analysis tool. Whether you're a seasoned developer or
                  just starting out, our platform provides valuable insights
                  into code structure, dependencies, and best practices.
                </p>
                <h3 className="text-xl font-semibold text-green-700 mt-6">
                  How It Works
                </h3>
                <ol className="list-decimal list-inside text-left text-gray-700 space-y-2">
                  <li>Enter a GitHub URL in the input field above</li>
                  <li>Click the "Learn Now" button to start the analysis</li>
                  <li>
                    Explore the breakdown of the repository's architecture
                  </li>
                  <li>
                    Gain insights into key components and project organization
                  </li>
                </ol>
                <h3 className="text-xl font-semibold text-green-700 mt-6">
                  Key Features
                </h3>
                <ul className="list-disc list-inside text-left text-gray-700 space-y-2">
                  <li>
                    **AI-Powered Analysis**: Leverage cutting-edge machine
                    learning algorithms
                  </li>
                  <li>
                    **Comprehensive Breakdown**: Get a detailed view of the
                    project structure
                  </li>
                  <li>
                    **Best Practices Highlight**: Learn from well-structured
                    repositories
                  </li>
                  <li>
                    **Dependency Mapping**: Understand the relationships between
                    different parts of the code
                  </li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mockData.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`p-4 rounded-lg shadow-md ${getStyleForImportance(
                      item.importance
                    )}`}
                  >
                    <p className="text-white text-sm">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
        <details>
          <summary className="text-xl font-bold text-green-800 mb-4">
            {demoFilePath}
          </summary>
          <FileVersionSlider
            filePath={demoFilePath}
            versions={codeLevels || []}
          />
        </details>
      </div>

      {graph && (
        <div>
          <h2>Reflexion Graph:</h2>
          <Graph graph={sampleModuleGraph} />
        </div>
      )}
    </div>
  )
}
