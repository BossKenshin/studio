
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler, UseFormSetValue } from 'react-hook-form';
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
  imageUrl: z.string().or(z.literal('')), // Accepts data URI or empty string
  description: z.string().min(1, 'Step description is required').max(1000, 'Step description is too long'),
});

const manualDataSchema = z.object({
  manualTitle: z.string().min(1, 'Manual title is required').max(150, 'Manual title is too long'),
  headerImageUrl: z.string().or(z.literal('')), // Accepts data URI or empty string
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

  const { control, register, formState: { errors }, watch, handleSubmit, setValue } = form;

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
        useCORS: true,
        logging: false,
        onclone: (document) => {
          Array.from(document.images).forEach(img => {
            if (img.complete) return;
            img.loading = 'eager';
          });
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20; // 20 points margin on each side
      
      const contentWidth = pdfPageWidth - (2 * margin);
      const contentHeight = pdfPageHeight - (2 * margin);

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Calculate the total height the canvas image would take if scaled to contentWidth
      const totalScaledCanvasHeight = (canvasHeight / canvasWidth) * contentWidth;

      if (totalScaledCanvasHeight <= contentHeight) {
        // Content fits on a single page
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, contentWidth, totalScaledCanvasHeight);
      } else {
        // Content needs to be paginated
        let remainingCanvasHeight = canvasHeight;
        let currentCanvasY = 0; // Y-offset for cropping from the source canvas

        while (remainingCanvasHeight > 0) {
          // Calculate the height of the canvas slice that corresponds to one PDF page's contentHeight
          // This slice, when its width (canvasWidth) is scaled to contentWidth, will have a height of contentHeight on PDF
          // while maintaining aspect ratio.
          let sliceCanvasHeight = (contentHeight / contentWidth) * canvasWidth;
          sliceCanvasHeight = Math.min(sliceCanvasHeight, remainingCanvasHeight); // Don't crop more than what's left

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasWidth;
          tempCanvas.height = sliceCanvasHeight;
          const tempCtx = tempCanvas.getContext('2d');

          if (!tempCtx) {
            throw new Error("Failed to get 2D context for temporary canvas slice.");
          }

          // Draw the slice from the main canvas to the temporary canvas
          tempCtx.drawImage(
            canvas,             // Source canvas
            0,                  // Source X
            currentCanvasY,     // Source Y (where to start cropping from main canvas)
            canvasWidth,        // Source Width
            sliceCanvasHeight,  // Source Height (height of the slice to crop)
            0,                  // Destination X on temp canvas
            0,                  // Destination Y on temp canvas
            canvasWidth,        // Destination Width on temp canvas
            sliceCanvasHeight   // Destination Height on temp canvas
          );
          
          const sliceImgData = tempCanvas.toDataURL('image/png');
          
          // Calculate the height of this slice when rendered on the PDF
          const slicePdfHeight = (sliceCanvasHeight / canvasWidth) * contentWidth;
          
          pdf.addImage(sliceImgData, 'PNG', margin, margin, contentWidth, slicePdfHeight);

          remainingCanvasHeight -= sliceCanvasHeight;
          currentCanvasY += sliceCanvasHeight;

          if (remainingCanvasHeight > 0) {
            pdf.addPage();
          }
        }
      }
      
      pdf.save(`${watchedData.manualTitle || 'manual'}.pdf`);
      toast({
        title: "Success!",
        description: "Your manual has been exported as a PDF.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      let errorMessage = "An error occurred while exporting the PDF. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // This onSubmit is for form validation trigger, not actual submission
  const onSubmit: SubmitHandler<ManualData> = (_data) => {
    // Could validate _data here if needed before calling export
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
        <Button onClick={handleSubmit(onSubmit)} disabled={isExporting || !form.formState.isValid} aria-label="Export to PDF">
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
            stepsFields={fields as unknown as ManualData['steps']} 
            appendStep={append}
            removeStep={remove}
            setValue={setValue as UseFormSetValue<ManualData>}
          />
        </section>
        <section className="w-full md:w-1/2 p-3 md:p-4 bg-muted/30 overflow-y-auto transition-all duration-300">
          <PdfPreview data={watchedData} />
        </section>
      </main>
    </div>
  );
}

