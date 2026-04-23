import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BUTTONS = [
  '7', '8', '9', '/',
  '4', '5', '6', '*',
  '1', '2', '3', '-',
  '0', '.', '=', '+',
  '(', ')', '^', 'C',
] as const;

const FUNCTION_BUTTONS = [
  { label: 'sin', value: 'sin(' },
  { label: 'cos', value: 'cos(' },
  { label: 'tan', value: 'tan(' },
  { label: 'sqrt', value: 'sqrt(' },
  { label: 'log', value: 'log(' },
  { label: 'ln', value: 'ln(' },
  { label: 'abs', value: 'abs(' },
  { label: 'ceil', value: 'ceil(' },
  { label: 'floor', value: 'floor(' },
] as const;

const CONSTANTS = [
  { label: 'π', value: 'pi' },
  { label: 'e', value: 'e' },
] as const;

interface CalculatorInputPanelProps {
  expression: string;
  loading: boolean;
  onExpressionChange: (value: string) => void;
  onAppendExpression: (value: string) => void;
  onButtonClick: (value: string) => void;
  onCalculate: () => void;
}

export function CalculatorInputPanel({
  expression,
  loading,
  onExpressionChange,
  onAppendExpression,
  onButtonClick,
  onCalculate,
}: CalculatorInputPanelProps) {
  return (
    <>
      <div className="mb-4">
        <Input
          type="text"
          value={expression}
          placeholder="Type or use buttons to build expression..."
          className="h-14 text-right font-mono text-2xl"
          disabled={loading}
          onChange={(e) => {
            const value = e.target.value;
            const mathPattern = /^[0-9+\-*/().^,\sa-z]*$/i;
            if (mathPattern.test(value)) {
              onExpressionChange(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCalculate();
            }
          }}
        />
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {BUTTONS.map((btn) => (
          <Button
            key={btn}
            size="lg"
            onClick={() => onButtonClick(btn)}
            disabled={loading}
            variant={btn === '=' ? 'default' : btn === 'C' ? 'destructive' : ['+', '-', '*', '/', '^'].includes(btn) ? 'secondary' : 'outline'}
          >
            {btn}
          </Button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {FUNCTION_BUTTONS.map((btn) => (
          <Button
            key={btn.label}
            size="sm"
            variant="secondary"
            onClick={() => onAppendExpression(btn.value)}
            disabled={loading}
            className="font-semibold"
          >
            {btn.label}
          </Button>
        ))}
      </div>

      <div className="mb-6 flex gap-2">
        {CONSTANTS.map((constant) => (
          <Button
            key={constant.label}
            size="sm"
            variant="secondary"
            onClick={() => onAppendExpression(constant.value)}
            disabled={loading}
            className="flex-1 text-lg font-bold"
          >
            {constant.label}
          </Button>
        ))}
      </div>
    </>
  );
}
