import { useState } from 'react'

interface Snippet {
  name: string
  value: string
}

function getSnippetsFromStorage(): Snippet[] {
  const snippetsStr = localStorage.getItem('snippets')
  if (!snippetsStr) {
    return []
  }

  try {
    const parsedSnippets: unknown = JSON.parse(snippetsStr)
    if (!Array.isArray(parsedSnippets)) {
      return []
    }

    return parsedSnippets.filter(
      (snippet): snippet is Snippet =>
        typeof snippet === 'object' &&
        snippet !== null &&
        'name' in snippet &&
        typeof snippet.name === 'string' &&
        'value' in snippet &&
        typeof snippet.value === 'string',
    )
  } catch {
    return []
  }
}

function updateSnippetsInStorage(snippetsArr: Snippet[] = []) {
  localStorage.setItem('snippets', JSON.stringify(snippetsArr))
}

export const useSnippets = () => {
  const [snippets, setSnippets] = useState<Snippet[]>(getSnippetsFromStorage())

  function createSnippet({ name, value }: Snippet) {
    const updatedSnippets = [...snippets]
    const snippetIndexForReplace = snippets.findIndex((item) => item.name === name)
    if (snippetIndexForReplace === -1) {
      updatedSnippets.push({ name, value })
    } else {
      updatedSnippets[snippetIndexForReplace].value = value
    }

    setSnippets(updatedSnippets)
    updateSnippetsInStorage(updatedSnippets)
  }

  function deleteSnippet(snippet: Snippet) {
    const updatedSnippets = snippets.filter((item) => item.name !== snippet.name)
    setSnippets(updatedSnippets)
    updateSnippetsInStorage(updatedSnippets)
  }

  return {
    createSnippet,
    deleteSnippet,
    snippets,
  }
}
