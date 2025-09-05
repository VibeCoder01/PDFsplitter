
import PdfSplitter from '@/components/pdf-splitter';
import { Scissors } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center p-4 sm:p-8 md:p-12">
      <div className="w-full max-w-4xl space-y-8">
        <header className="flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-3 rounded-full bg-primary/10 p-3">
            <Scissors className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            PDF Splitter
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Easily divide your PDF files. Upload a document and split it by page count.
          </p>
        </header>
        <PdfSplitter />
      </div>
    </main>
  );
}
