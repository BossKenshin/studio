'use client';

import type { Control, FieldErrors, UseFieldArrayAppend, UseFieldArrayRemove, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { ManualData, ManualStep } from '@/types/manual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, UploadCloud } from 'lucide-react';
import { Separator } from './ui/separator';

interface ManualFormProps {
  control: Control<ManualData>;
  register: UseFormRegister<ManualData>;
  errors: FieldErrors<ManualData>;
  stepsFields: ManualStep[]; // from useFieldArray
  appendStep: UseFieldArrayAppend<ManualData, 'steps'>;
  removeStep: UseFieldArrayRemove;
  setValue: UseFormSetValue<ManualData>;
}

export function ManualForm({
  register,
  errors,
  stepsFields,
  appendStep,
  removeStep,
  setValue,
}: ManualFormProps) {
  const addNewStep = () => {
    appendStep({ id: crypto.randomUUID(), title: '', imageUrl: '', description: '' });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: keyof ManualData | `steps.${number}.imageUrl`
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue(fieldName, reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    } else {
      // If no file is selected (e.g., user cancels dialog), clear the value
      setValue(fieldName, '', { shouldValidate: true });
    }
  };

  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-primary">Create Your Manual</CardTitle>
        <CardDescription>Fill in the details below to generate your manual.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-y-auto h-[calc(100%-6.5rem)] p-4 md:p-6">
        <div className="space-y-2">
          <Label htmlFor="manualTitle" className="text-foreground/90">Manual Title</Label>
          <Input
            id="manualTitle"
            placeholder="e.g., How to Assemble Your New Desk"
            {...register('manualTitle')}
            className={errors.manualTitle ? 'border-destructive' : ''}
          />
          {errors.manualTitle && (
            <p className="text-sm text-destructive">{errors.manualTitle.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="headerImageFile" className="text-foreground/90">Header Image</Label>
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            <Input
              id="headerImageFile"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'headerImageUrl')}
              className={`h-13 cursor-pointer file:mr-4 file:py-2 file:px-4 file:pb-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 ${errors.headerImageUrl ? 'border-destructive' : ''}`}
            />
          </div>
          {errors.headerImageUrl && (
            <p className="text-sm text-destructive">{errors.headerImageUrl.message}</p>
          )}
        </div>

        <div className="space-y-2">
              <Label htmlFor="manualTextArea" className="text-xs text-foreground/80">Description</Label>
              <textarea id="manualTextArea"
                                {...register('manualTextArea')}
                    placeholder="e.g., Carefully lay out all parts on a soft surface..."
                    className={`flex w-full rounded-md border border-input 
                      bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground 
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                      disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[80px]
                    `}>

              </textarea>


        </div>

        <Separator className="my-6" />

        <div>
          <h3 className="text-lg font-medium mb-4 text-foreground/90">Manual Steps</h3>
          {stepsFields.map((step, index) => (
            <Card key={step.id} className="mb-6 bg-secondary/30 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-md text-primary/90">Step {index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                    className="text-destructive hover:bg-destructive/10"
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-4 md:px-6 pb-4">
                <div className="space-y-1">
                  <Label htmlFor={`steps.${index}.title`} className="text-xs text-foreground/80">Step Title</Label>
                  <Input
                    id={`steps.${index}.title`}
                    placeholder="e.g., Unpack all components"
                    {...register(`steps.${index}.title`)}
                    className={errors.steps?.[index]?.title ? 'border-destructive' : ''}
                  />
                  {errors.steps?.[index]?.title && (
                    <p className="text-sm text-destructive">
                      {errors.steps[index]?.title?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`steps.${index}.imageFile`} className="text-xs text-foreground/80">Step Image</Label>
                  <div className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id={`steps.${index}.imageFile`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, `steps.${index}.imageUrl`)}
                      className={`cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 ${errors.steps?.[index]?.imageUrl ? 'border-destructive' : ''}`}
                    />
                  </div>
                   {errors.steps?.[index]?.imageUrl && (
                    <p className="text-sm text-destructive">
                      {errors.steps[index]?.imageUrl?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`steps.${index}.description`} className="text-xs text-foreground/80">Step Description</Label>
                  <Textarea
                    id={`steps.${index}.description`}
                    placeholder="e.g., Carefully lay out all parts on a soft surface..."
                    {...register(`steps.${index}.description`)}
                    className={`min-h-[80px] ${errors.steps?.[index]?.description ? 'border-destructive' : ''}`}
                  />
                   {errors.steps?.[index]?.description && (
                    <p className="text-sm text-destructive">
                      {errors.steps[index]?.description?.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addNewStep} className="w-full border-dashed hover:bg-accent/10 hover:text-accent-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Step
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
