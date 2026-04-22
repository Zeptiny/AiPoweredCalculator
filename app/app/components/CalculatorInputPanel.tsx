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
      <div className="form-control w-full mb-4">
        <input
          type="text"
          value={expression}
          placeholder="Type or use buttons to build expression..."
          className="input input-lg input-primary w-full text-2xl font-mono text-right"
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

      <div className="grid grid-cols-4 gap-2 mb-4">
        {BUTTONS.map((btn) => (
          <button
            key={btn}
            onClick={() => onButtonClick(btn)}
            disabled={loading}
            className={`btn btn-lg ${
              btn === '='
                ? 'btn-primary'
                : btn === 'C'
                  ? 'btn-error'
                  : ['+', '-', '*', '/', '^'].includes(btn)
                    ? 'btn-accent'
                    : 'btn-neutral'
            }`}
          >
            {btn}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {FUNCTION_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            onClick={() => onAppendExpression(btn.value)}
            disabled={loading}
            className="btn btn-sm btn-secondary font-semibold hover:btn-accent transition-colors"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {CONSTANTS.map((constant) => (
          <button
            key={constant.label}
            onClick={() => onAppendExpression(constant.value)}
            disabled={loading}
            className="btn btn-sm btn-secondary flex-1 font-bold text-lg hover:btn-accent transition-colors"
          >
            {constant.label}
          </button>
        ))}
      </div>
    </>
  );
}
