'use server';
/**
 * @fileOverview This flow splits a PDF based on user-provided delimiters.
 *
 * - splitPdfByDelimiter - A function that handles the PDF splitting process.
 * - SplitPdfByDelimiterInput - The input type for the splitPdfByDelimiter function.
 * - SplitPdfByDelimiterOutput - The return type for the splitPdfByDelimiter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SplitPdfByDelimiterInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  delimiterRegex: z
    .string()
    .describe('The regular expression to use to split the PDF.'),
});
export type SplitPdfByDelimiterInput = z.infer<typeof SplitPdfByDelimiterInputSchema>;

const SplitPdfByDelimiterOutputSchema = z.object({
  splitInstructions: z
    .string()
    .describe(
      'Instructions for how to split the PDF, based on the delimiter.  This should be a JSON array of page numbers where each element indicates the start of a new PDF section.'
    ),
});
export type SplitPdfByDelimiterOutput = z.infer<typeof SplitPdfByDelimiterOutputSchema>;

export async function splitPdfByDelimiter(
  input: SplitPdfByDelimiterInput
): Promise<SplitPdfByDelimiterOutput> {
  return splitPdfByDelimiterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'splitPdfByDelimiterPrompt',
  input: {schema: SplitPdfByDelimiterInputSchema},
  output: {schema: SplitPdfByDelimiterOutputSchema},
  prompt: `You are a PDF splitting expert.

You will receive a PDF as a data URI, and a regular expression to use as a delimiter.

Your job is to analyze the PDF and determine the page numbers where the PDF should be split, such that each split begins with a matching delimiter.

Return a JSON array containing the page numbers where the PDF should be split. The first element of the array should be 1.

PDF: {{media url=pdfDataUri}}
Delimiter Regex: {{{delimiterRegex}}}`,
});

const splitPdfByDelimiterFlow = ai.defineFlow(
  {
    name: 'splitPdfByDelimiterFlow',
    inputSchema: SplitPdfByDelimiterInputSchema,
    outputSchema: SplitPdfByDelimiterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
