// src/lib/atsScorer.ts

// A heuristic-based approach to scoring a resume against a job description.

// 1. Common English stop words to filter out before keyword matching
const stopWords = new Set(["a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in", "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the", "their", "then", "there", "these", "they", "this", "to", "was", "will", "with"]);

// 2. High-impact action verbs ATS systems often look for
const actionVerbs = new Set([
    "achieved", "analyzed", "architected", "built", "collaborated", "created", 
    "delivered", "designed", "developed", "directed", "driven", "engineered",
    "established", "executed", "facilitated", "generated", "implemented", 
    "improved", "increased", "initiated", "launched", "led", "managed",
    "maximized", "negotiated", "optimized", "orchestrated", "organized",
    "overhauled", "pioneered", "reduced", "resolved", "spearheaded", "streamlined",
    "transformed", "upgraded", "yielded"
]);

export interface ATSResults {
    overallScore: number;
    keywordMatchRate: number;
    missingKeywords: string[];
    foundKeywords: string[];
    actionVerbsFound: string[];
    hasMetrics: boolean;
    wordCount: number;
    suggestions: string[];
}

export function analyzeResume(resumeText: string, jobDescription: string): ATSResults {
    const resumeWordsRaw = resumeText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const jdWordsRaw = jobDescription.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);

    // Filter JD for keywords (words > 3 chars, not stop words)
    // In a real system, TF-IDF or NER is used. Here, we use frequency and filtering.
    const jdWordCounts: Record<string, number> = {};
    for (const w of jdWordsRaw) {
        if (w.length > 3 && !stopWords.has(w) && isNaN(Number(w))) {
            jdWordCounts[w] = (jdWordCounts[w] || 0) + 1;
        }
    }

    // Extract top keywords from JD (occurring more than once, or just top 20 if brief)
    let jdKeywords = Object.entries(jdWordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(entry => entry[0]);

    // If the JD is very short and has no repeating words, just take all non-stop words > 3 chars
    if (jdKeywords.length === 0) {
        jdKeywords = [...new Set(jdWordsRaw.filter(w => w.length > 3 && !stopWords.has(w) && isNaN(Number(w))))];
    }

    const resumeWordsSet = new Set(resumeWordsRaw);

    const foundKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const kw of jdKeywords) {
        // Simple plural stemming (e.g., checks 'react' if 'reacts', checking substring presence within boundaries is safer)
        const isFound = resumeWordsRaw.some(rw => rw === kw || rw.startsWith(kw) || kw.startsWith(rw));
        if (isFound) {
            foundKeywords.push(kw);
        } else {
            missingKeywords.push(kw);
        }
    }

    const keywordMatchRate = jdKeywords.length > 0 ? (foundKeywords.length / jdKeywords.length) * 100 : 100;

    // Check Action Verbs
    const foundVerbs = Array.from(actionVerbs).filter(verb => resumeWordsSet.has(verb) || resumeWordsRaw.some(rw => rw.startsWith(verb.substring(0, 5))));
    
    // Check for Metrics (numbers, percentages, $ symbols in original text)
    const hasMetrics = /\d+%|\$\d+|\d+\s*(million|k|billion)/i.test(resumeText);
    const wordCount = resumeWordsRaw.length;

    // Calculate Score (Weights: 60% keywords, 20% action verbs, 10% metrics, 10% length)
    let score = keywordMatchRate * 0.6;
    score += Math.min((foundVerbs.length / 5) * 20, 20); // Max 20 points for 5+ action verbs
    if (hasMetrics) score += 10;
    
    // Length check: ideal resume is ~400 - 800 words. Too little (-5), too much (-5)
    if (wordCount >= 300 && wordCount <= 1000) {
        score += 10;
    } else if (wordCount > 100) {
        score += 5;
    }

    const suggestions: string[] = [];
    if (missingKeywords.length > 0) {
        suggestions.push(`Add missing keywords to your resume to pass ATS filters: ${missingKeywords.slice(0, 5).join(', ')}.`);
    }
    if (foundVerbs.length < 3) {
        suggestions.push('Use more powerful action verbs to describe your experience (e.g., "Led", "Optimized", "Developed").');
    }
    if (!hasMetrics) {
        suggestions.push('Include measurable metrics (percentages, dollar amounts, time saved) to quantify your impact.');
    }
    if (wordCount < 300) {
        suggestions.push('Your resume seems a bit short. Detail your experiences and projects more thoroughly.');
    } else if (wordCount > 1000) {
        suggestions.push('Your resume is quite wordy. Try to condense it to the most relevant points to keep it concise.');
    }
    if (suggestions.length === 0) {
        suggestions.push('Great job! Your resume looks well-optimized for this job description.');
    }

    return {
        overallScore: Math.round(Math.min(score, 100)),
        keywordMatchRate: Math.round(keywordMatchRate),
        missingKeywords,
        foundKeywords,
        actionVerbsFound: foundVerbs,
        hasMetrics,
        wordCount,
        suggestions
    };
}
