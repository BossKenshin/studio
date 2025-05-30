
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler, UseFormSetValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PptxGenJS from 'pptxgenjs';

import type { ManualData } from '@/types/manual';
import { ManualForm } from '@/components/manual-form';
import { PdfPreview } from '@/components/pdf-preview';
import { Button } from '@/components/ui/button';
import { ManualMaestroLogo } from '@/components/icons/logo';
import { Download, Loader2, Presentation } from 'lucide-react';
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
  manualTextArea: z.string().min(1, 'Manual description is required').max(1000, 'Manual description is too long'),
  steps: z.array(manualStepSchema),
});

const defaultValues: ManualData = {
  manualTitle: 'My Awesome Manual',
  headerImageUrl: '',
  manualTextArea: 'Description Manual',
  steps: [{ id: crypto.randomUUID(), title: 'Step 1: Get Started', imageUrl: '', description: 'This is the first thing you need to do.' }],
};

// Helper function to handle image loading in html2canvas onclone
const cloneDocumentImages = (documentClone: Document) => {
  Array.from(documentClone.images).forEach(img => {
    if (img.complete) return;
    img.loading = 'eager'; 
  });
};

// Helper function to add a canvas (potentially paginated) to the PDF
async function addCanvasToPdf(
  pdfInstance: jsPDF,
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  itemMargin: number
) {
  const contentWidth = pageWidth - (2 * itemMargin);
  const contentHeight = pageHeight - (2 * itemMargin);
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  if (canvasWidth === 0 || canvasHeight === 0) return; 

  const totalScaledCanvasHeight = (canvasHeight / canvasWidth) * contentWidth;

  if (totalScaledCanvasHeight <= contentHeight) {
    pdfInstance.addImage(canvas.toDataURL('image/png'), 'PNG', itemMargin, itemMargin, contentWidth, totalScaledCanvasHeight);
  } else {
    let remainingCanvasHeight = canvasHeight;
    let currentCanvasY = 0; 
    let isFirstSlice = true;

    while (remainingCanvasHeight > 0) {
      if (!isFirstSlice) {
        pdfInstance.addPage();
      }
      isFirstSlice = false;

      let sliceCanvasHeight = (contentHeight / contentWidth) * canvasWidth;
      sliceCanvasHeight = Math.min(sliceCanvasHeight, remainingCanvasHeight);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = sliceCanvasHeight;
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
        console.error("Failed to get 2D context for temporary canvas slice.");
        return; 
      }

      tempCtx.drawImage(
        canvas,
        0,
        currentCanvasY,
        canvasWidth,
        sliceCanvasHeight,
        0,
        0,
        canvasWidth,
        sliceCanvasHeight
      );
      
      const sliceImgData = tempCanvas.toDataURL('image/png');
      const slicePdfHeight = (sliceCanvasHeight / canvasWidth) * contentWidth;
      
      pdfInstance.addImage(sliceImgData, 'PNG', itemMargin, itemMargin, contentWidth, slicePdfHeight);

      remainingCanvasHeight -= sliceCanvasHeight;
      currentCanvasY += sliceCanvasHeight;
    }
  }
}


export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPpt, setIsExportingPpt] = useState(false);
  const { toast } = useToast();

  const form = useForm<ManualData>({
    resolver: zodResolver(manualDataSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { control, register, formState: { errors, isValid }, watch, handleSubmit, setValue } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'steps',
  });

  const watchedData = watch();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleExportPdf = async () => {
    if (!isValid) {
        toast({
            title: "Form Invalid",
            description: "Please correct the errors in the form before exporting.",
            variant: "destructive",
        });
        return;
    }
    setIsExportingPdf(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const margin = 30; 
      
      let contentHasBeenAdded = false;

      const headerElement = document.getElementById('pdf-header-content');
      if (headerElement && (watchedData.manualTitle.trim() !== '' || watchedData.headerImageUrl !== '')) {
        const headerCanvas = await html2canvas(headerElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: cloneDocumentImages,
          backgroundColor: '#ffffff', 
        });
        if (headerCanvas.width > 0 && headerCanvas.height > 0) {
          await addCanvasToPdf(pdf, headerCanvas, pdfPageWidth, pdfPageHeight, margin);
          contentHasBeenAdded = true;
        }
      }

      for (let i = 0; i < watchedData.steps.length; i++) {
        const stepElement = document.getElementById(`pdf-step-content-${i}`);
        if (stepElement) {
          const stepCanvas = await html2canvas(stepElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            onclone: cloneDocumentImages,
            backgroundColor: '#ffffff',
          });

          if (stepCanvas.width > 0 && stepCanvas.height > 0) {
            if (contentHasBeenAdded) { 
              pdf.addPage();
            } else {
              contentHasBeenAdded = true; 
            }
            await addCanvasToPdf(pdf, stepCanvas, pdfPageWidth, pdfPageHeight, margin);
          }
        }
      }
      
      if (!contentHasBeenAdded) {
        toast({
          title: "Empty Manual",
          description: "There is no content to export.",
          variant: "destructive",
        });
        setIsExportingPdf(false);
        return;
      }

      pdf.save(`${watchedData.manualTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'manual'}.pdf`);
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
      setIsExportingPdf(false);
    }
  };
  
  const handleExportPpt = async () => {
    if (!isValid) {
      toast({
        title: "Form Invalid",
        description: "Please correct the errors in the form before exporting.",
        variant: "destructive",
      });
      return;
    }
    setIsExportingPpt(true);

    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9'; // Standard widescreen layout

      let contentHasBeenAdded = false;
      const canvasOptions = {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: cloneDocumentImages,
        backgroundColor: '#ffffff',
      };
      const imageOptions: PptxGenJS.ImageProps = { x: 0.5, y: 0.25, w: 9.0, h: 7.0, sizing: { type: 'contain', w: 9.0, h: 7.0 } };


      const headerElement = document.getElementById('pdf-header-content');
      if (headerElement && (watchedData.manualTitle.trim() !== '' || watchedData.headerImageUrl !== '')) {
        const headerCanvas = await html2canvas(headerElement, canvasOptions);
        if (headerCanvas.width > 0 && headerCanvas.height > 0) {
          const slide = pptx.addSlide();
          slide.addImage({ ...imageOptions, data: headerCanvas.toDataURL('image/png') });
          contentHasBeenAdded = true;
        }
      }

      for (let i = 0; i < watchedData.steps.length; i++) {
        const stepElement = document.getElementById(`pdf-step-content-${i}`);
        if (stepElement) {
          const stepCanvas = await html2canvas(stepElement, canvasOptions);
          if (stepCanvas.width > 0 && stepCanvas.height > 0) {
            const slide = pptx.addSlide();
            slide.addImage({ ...imageOptions, data: stepCanvas.toDataURL('image/png') });
            contentHasBeenAdded = true;
          }
        }
      }

      if (!contentHasBeenAdded) {
        toast({
          title: "Empty Manual",
          description: "There is no content to export for PPT.",
          variant: "destructive",
        });
        setIsExportingPpt(false);
        return;
      }

      await pptx.writeFile({ fileName: `${watchedData.manualTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'manual'}.pptx` });
      toast({
        title: "Success!",
        description: "Your manual has been exported as a PPTX.",
      });

    } catch (error) {
      console.error("Error exporting PPT:", error);
      let errorMessage = "An error occurred while exporting the PPT. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "PPT Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExportingPpt(false);
    }
  };

  const onPdfSubmit: SubmitHandler<ManualData> = (_data) => {
    handleExportPdf();
  };


  if (!isClient) {
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
        <div className="flex items-center gap-2">
          <Button onClick={handleExportPpt} disabled={isExportingPdf || isExportingPpt || !isValid} aria-label="Export to PowerPoint">
            {isExportingPpt ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Presentation className="mr-2 h-4 w-4" />
            )}
            Export PPT
          </Button>
          <Button onClick={handleSubmit(onPdfSubmit)} disabled={isExportingPdf || isExportingPpt || !isValid} aria-label="Export to PDF">
            {isExportingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
        </div>
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
