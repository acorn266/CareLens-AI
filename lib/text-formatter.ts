// Utility functions for formatting AI responses

export function cleanMarkdownText(text: string): string {
  if (!text) return "";
  
  // Remove markdown bold formatting (**text** -> text)
  let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Remove markdown italic formatting (*text* -> text) but be careful not to remove bullet points
  cleaned = cleaned.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '$1');
  
  // Remove markdown headers (# ## ### -> )
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove any remaining standalone asterisks
  cleaned = cleaned.replace(/\s+\*\s+/g, ' ');
  cleaned = cleaned.replace(/^\*\s+/gm, '');
  
  // Clean up section titles that might have asterisks
  cleaned = cleaned.replace(/\*\*(\d+\.\s[^*]+)\*\*/g, '$1');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

export function formatAnalysisText(text: string): string {
  if (!text) return "";
  
  // Clean markdown first
  let formatted = cleanMarkdownText(text);
  
  // Add proper spacing around numbered lists
  formatted = formatted.replace(/(\d+\.\s)/g, '\n$1');
  
  // Add spacing around bullet points
  formatted = formatted.replace(/(\*\s)/g, '\n$1');
  
  // Clean up multiple newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted.trim();
}

export function parseAnalysisSections(text: string): Array<{title: string, content: string}> {
  if (!text) return [];
  
  const sections: Array<{title: string, content: string}> = [];
  const lines = text.split('\n');
  let currentSection = { title: '', content: '' };
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is a section header (starts with number and period)
    if (/^\d+\.\s/.test(trimmedLine)) {
      // Save previous section if it has content
      if (currentSection.title || currentSection.content) {
        sections.push({ ...currentSection });
      }
      
      // Start new section
      currentSection = {
        title: trimmedLine.replace(/^\d+\.\s/, ''),
        content: ''
      };
    } else if (trimmedLine) {
      // Add content to current section
      currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
    }
  }
  
  // Add the last section
  if (currentSection.title || currentSection.content) {
    sections.push(currentSection);
  }
  
  return sections;
}
