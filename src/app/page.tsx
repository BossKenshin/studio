'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import type { ManualData } from '@/types/manual';
import { ManualForm } from '@/components/manual-form';
import { PdfPreview } from '@/components/pdf-preview';
import { Button } from '@/components/ui/button';
import { ManualMaestroLogo } from '@/components/icons/logo';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const manualStepSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Step title is required').max(100, 'Step title is too long'),
  imageUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  description: z.string().min(1, 'Step description is required').max(1000, 'Step description is too long'),
});

const manualDataSchema = z.object({
  manualTitle: z.string().min(1, 'Manual title is required').max(150, 'Manual title is too long'),
  headerImageUrl: z.string().url('Must be a valid URL').or(z.literal('')),
  steps: z.array(manualStepSchema),
});

const defaultValues: ManualData = {
  manualTitle: '',
  headerImageUrl: '',
  steps: [{ id: crypto.randomUUID(), title: '', imageUrl: '', description: '' }],
};

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ManualData>({
    resolver: zodResolver(manualDataSchema),
    defaultValues,
    mode: 'onChange', // Watch for changes to update preview
  });

  const { control, register, formState: { errors }, watch, handleSubmit } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'steps',
  });

  // Watch all form data for live preview
  const watchedData = watch();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleExportPdf = async () => {
    setIsExporting(true);
    const previewElement = document.getElementById('pdf-preview-content');
    if (!previewElement) {
      toast({
        title: "Error",
        description: "Preview content not found. Cannot export PDF.",
        variant: "destructive",
      });
      setIsExporting(false);
      return;
    }

    try {
      const canvas = await html2canvas(previewElement, {
        scale: 2, // Improve quality
        useCORS: true, // For external images
        logging: false,
        onclone: (document) => { // Ensure all images are loaded before rendering
          Array.from(document.images).forEach(img => {
            if (img.complete) return;
            img.loading = 'eager';
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt', // points
        format: 'a4', // A4 paper size
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate aspect ratio to fit image into PDF page
      const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);
      const imgWidth = canvasWidth * ratio;
      const imgHeight = canvasHeight * ratio;

      // Center the image on the PDF page
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`${watchedData.manualTitle || 'manual'}.pdf`);
      toast({
        title: "Success!",
        description: "Your manual has been exported as a PDF.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // This onSubmit is for form validation trigger, not actual submission
  const onSubmit: SubmitHandler<ManualData> = (_data) => {
    handleExportPdf();
  };


  if (!isClient) {
    // Render a loading state or null on the server
    return (
        <div className="flex flex-col h-screen">
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md shadow-sm">
                <ManualMaestroLogo />
                <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
            </header>
            <main className="flex flex-1 overflow-hidden">
                <div className="w-1/2 p-4 border-r overflow-y-auto animate-pulse">
                    <div className="h-16 bg-muted rounded mb-4"></div>
                    <div className="h-10 bg-muted rounded mb-2"></div>
                    <div className="h-24 bg-muted rounded mb-4"></div>
                    <div className="h-10 bg-muted rounded mb-2"></div>
                    <div className="h-24 bg-muted rounded mb-4"></div>
                </div>
                <div className="w-1/2 p-4 bg-secondary/20 overflow-y-auto animate-pulse">
                    <div className="h-full bg-muted rounded"></div>
                </div>
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen antialiased">
      <header className="sticky top-0 z-10 flex items-center justify-between p-3 md:p-4 border-b bg-background/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <ManualMaestroLogo />
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={isExporting} aria-label="Export to PDF">
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export PDF
        </Button>
      </header>

      <main className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <section className="w-full md:w-1/2 p-3 md:p-4 border-r overflow-y-auto bg-background focus-within:shadow-inner transition-shadow duration-300">
          <ManualForm
            control={control}
            register={register}
            errors={errors}
            stepsFields={fields as ManualData['steps']} // Cast because react-hook-form types FieldArray fields with an internal _id
            appendStep={append}
            removeStep={remove}
          />
        </section>
        <section className="w-full md:w-1/2 p-3 md:p-4 bg-muted/30 overflow-y-auto transition-all duration-300">
          <PdfPreview data={watchedData} />
        </section>
      </main>
    </div>
  );
}
