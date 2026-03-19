import { Checkbox } from '@frontend/components/ui/checkbox';

interface DisclaimerCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function DisclaimerCheckbox({ checked, onChange, disabled = false }: DisclaimerCheckboxProps) {
  return (
    <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border border-muted">
      <Checkbox
        checked={checked}
        className="mt-1"
        data-testid="disclaimer-checkbox"
        disabled={disabled}
        id="disclaimer"
        onCheckedChange={checked => onChange(checked as boolean)}
      />
      <div className="space-y-1 leading-none">
        <label
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          htmlFor="disclaimer"
        >
          I confirm these documents do not contain sensitive personal information
        </label>
        <p className="text-xs text-muted-foreground">
          By checking this box, you agree to our terms of service and confirm that you have the right to process these
          documents.
        </p>
      </div>
    </div>
  );
}
