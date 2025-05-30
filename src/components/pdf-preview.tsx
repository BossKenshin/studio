
'use client';

import type { ManualData } from '@/types/manual';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PdfPreviewProps {
  data: ManualData;
}

export function PdfPreview({ data }: PdfPreviewProps) {
  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-primary">Live Preview</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-y-auto p-2 md:p-4">
        {/* This outer div is for overall scroll and sizing in the UI, not directly for PDF export of the whole block */}
        <div className="bg-white text-black p-0 rounded shadow-md min-h-[29.7cm] w-[21cm] max-w-full mx-auto print:shadow-none print:p-0">
          
          {/* Section for PDF Header Content */}
          <div id="pdf-header-content" className="p-8 break-inside-avoid">
            <h1 className="text-4xl font-bold mb-6 text-center text-gray-800 break-words">
              {data.manualTitle || 'Manual Title'}
            </h1>
            {data.headerImageUrl && (
              <div className="mb-8 w-full h-64 relative overflow-hidden rounded-md shadow">
                <Image
                  src={data.headerImageUrl}
                  alt={data.manualTitle || 'Header Image'}
                  fill // Changed from layout="fill" for Next 13+
                  style={{ objectFit: 'cover' }} // Changed from objectFit="cover"
                  data-ai-hint="document header"
                  onError={(e) => (e.currentTarget.src = 'https://placehold.co/800x400.png')}
                />
              </div>
            )}
             {!(data.manualTitle || data.headerImageUrl) && data.steps.length === 0 && (
                <div className="text-center text-gray-500 py-10 min-h-[50px]"> 
                    {/* Placeholder for empty header if no steps either */}
                </div>
            )}
          </div>

          {/* Steps */}
          {data.steps.map((step, index) => (
            <div 
              key={step.id || index} 
              id={`pdf-step-content-${index}`} // Unique ID for each step
              className="p-8 mb-0 border-t border-gray-100 bg-white break-inside-avoid" // Added p-8 for consistent padding like header
            >
              <h2 className="text-2xl font-semibold mb-3 text-gray-700 break-words">
                Step {index + 1}: {step.title || 'Step Title'}
              </h2>
              {step.imageUrl && (
                <div className="mb-4 w-full h-56 relative overflow-hidden rounded-md shadow-sm">
                  <Image
                    src={step.imageUrl}
                    alt={step.title || `Step ${index + 1} Image`}
                    fill
                    style={{ objectFit: 'contain' }}
                    data-ai-hint="step instruction"
                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/600x400.png')}
                  />
                </div>
              )}
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-words">
                {step.description || 'Step description goes here.'}
              </p>
            </div>
          ))}

          {/* Fallback message if there are no steps AND no title/header image */}
          {data.steps.length === 0 && !data.manualTitle && !data.headerImageUrl && (
             <div className="text-center text-gray-500 p-8">
                <p>Add a title, header image, or steps to your manual using the form.</p>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
