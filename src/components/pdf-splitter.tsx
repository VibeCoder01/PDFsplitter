
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  File as FileIcon,
  Scissors,
  Download,
  Loader2,
  BookOpen,
  Regex,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { AnimatePresence, motion } from 'framer-motion';

import { useToast } from '@/hooks/use-toast';
import { splitPdfByDelimiter } from '@/ai/flows/split-pdf-by-delimiter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Dropzone from '@/components/dropzone';

type SplitMethod = 'pages' | 'delimiter';
type SplitPreview = { start: number; end: number }[];
type ProcessingState = { active: boolean; message: string };

const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function PdfSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('pages');
  const [splitValue, setSplitValue] = useState('1');
  const [preview, setPreview] = useState<SplitPreview | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ active: false, message: '' });
  const { toast } = useToast();

  const handleFileDrop = useCallback(async (droppedFile: File) => {
    setProcessing({ active: true, message: 'Analyzing PDF...' });
    setFile(null);
    setPreview(null);
    try {
      const arrayBuffer = await droppedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
      setFile(droppedFile);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error reading PDF',
        description: 'The selected file could not be processed. Please try another PDF.',
      });
    } finally {
      setProcessing({ active: false, message: '' });
    }
  }, [toast]);

  const handlePreview = async () => {
    if (!file) return;
    setProcessing({ active: true, message: 'Generating preview...' });
    setPreview(null);
    
    try {
      let ranges: SplitPreview = [];
      if (splitMethod === 'pages') {
        const pagesPerSplit = parseInt(splitValue, 10);
        if (isNaN(pagesPerSplit) || pagesPerSplit <= 0) {
          throw new Error('Please enter a valid number of pages greater than 0.');
        }
        for (let i = 0; i < totalPages; i += pagesPerSplit) {
          ranges.push({ start: i + 1, end: Math.min(i + pagesPerSplit, totalPages) });
        }
      } else {
        if (!splitValue.trim()) {
            throw new Error('Please enter a delimiter regular expression.');
        }
        const dataUri = await fileToDataUri(file);
        const result = await splitPdfByDelimiter({ pdfDataUri: dataUri, delimiterRegex: splitValue });
        const startPages = JSON.parse(result.splitInstructions);
        if (!Array.isArray(startPages) || startPages.length === 0) {
            throw new Error('AI could not determine split points. Try a different delimiter.');
        }
        ranges = startPages.map((startPage, index) => ({
          start: startPage,
          end: (index + 1 < startPages.length) ? startPages[index + 1] - 1 : totalPages,
        }));
      }
      setPreview(ranges);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Preview Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setProcessing({ active: false, message: '' });
    }
  };

  const handleSplitAndDownload = async () => {
    if (!file || !preview) return;

    setProcessing({ active: true, message: 'Splitting PDF...' });

    try {
      const originalPdfBytes = await file.arrayBuffer();
      const originalPdfDoc = await PDFDocument.load(originalPdfBytes);
      const zip = new JSZip();

      for (let i = 0; i < preview.length; i++) {
        const range = preview[i];
        setProcessing({ active: true, message: `Creating document ${i + 1} of ${preview.length}...` });
        const newPdfDoc = await PDFDocument.create();
        const pageIndices = Array.from({ length: range.end - range.start + 1 }, (_, k) => range.start - 1 + k);
        const copiedPages = await newPdfDoc.copyPages(originalPdfDoc, pageIndices);
        copiedPages.forEach((page) => newPdfDoc.addPage(page));
        const newPdfBytes = await newPdfDoc.save();
        zip.file(`${file.name.replace('.pdf', '')}_part_${i + 1}.pdf`, newPdfBytes);
      }
      
      setProcessing({ active: true, message: 'Compressing files...' });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${file.name.replace('.pdf', '')}_split.zip`);

    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Split Failed',
        description: 'An error occurred while splitting the PDF.',
      });
    } finally {
      setProcessing({ active: false, message: '' });
    }
  };

  const reset = () => {
    setFile(null);
    setTotalPages(0);
    setPreview(null);
    setSplitValue('1');
    setSplitMethod('pages');
  };

  const pageCount = useMemo(() => parseInt(splitValue, 10), [splitValue]);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {!file && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle>Upload your PDF</CardTitle>
                <CardDescription>Drag and drop a PDF file or click to select one from your device.</CardDescription>
              </CardHeader>
              <CardContent>
                <Dropzone onFileDrop={handleFileDrop} disabled={processing.active} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <Card>
              <CardHeader>
                  <CardTitle>Uploaded File</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <FileIcon className="h-10 w-10 text-primary" />
                      <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">{totalPages} pages &bull; {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={reset} disabled={processing.active}>
                      <X className="h-5 w-5" />
                  </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Choose Split Method</CardTitle>
                <CardDescription>Select how you want to divide your PDF.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={splitMethod} onValueChange={(v) => setSplitMethod(v as SplitMethod)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pages"><BookOpen className="mr-2" /> By Page Count</TabsTrigger>
                    <TabsTrigger value="delimiter"><Regex className="mr-2"/> By Delimiter (AI)</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pages" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="pages-per-split">Pages per file</Label>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => setSplitValue(String(Math.max(1, pageCount - 1)))}><Minus className="h-4 w-4" /></Button>
                          <Input id="pages-per-split" type="number" value={splitValue} onChange={(e) => setSplitValue(e.target.value)} min="1" className="text-center" />
                          <Button variant="outline" size="icon" onClick={() => setSplitValue(String(pageCount + 1))}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="delimiter" className="mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="delimiter-regex">Delimiter (Regular Expression)</Label>
                        <Input id="delimiter-regex" placeholder="e.g., ^Chapter \\d+" value={splitValue} onChange={(e) => setSplitValue(e.target.value)} />
                        <p className="text-xs text-muted-foreground">The AI will find pages that start with text matching this pattern.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter>
                 <Button onClick={handlePreview} disabled={processing.active} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Scissors className="mr-2 h-4 w-4" />
                    Preview Split
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <Card>
                <CardHeader>
                    <CardTitle>3. Preview and Download</CardTitle>
                    <CardDescription>Your PDF will be split into {preview.length} documents.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-48 w-full rounded-md border p-4">
                        <ul className="space-y-2">
                            {preview.map((range, i) => (
                                <li key={i} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                                        <span>{file?.name.replace('.pdf', '')}_part_{i + 1}.pdf</span>
                                    </div>
                                    <span className="text-muted-foreground">Pages {range.start} - {range.end}</span>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSplitAndDownload} disabled={processing.active} className="w-full">
                        {processing.active ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {processing.active ? processing.message : `Split & Download ${preview.length} Files (.zip)`}
                    </Button>
                </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
