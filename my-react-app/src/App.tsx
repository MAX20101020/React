import { useState } from 'react'
import './App.css'

function App() {
  const [display, setDisplay] = useState<string>('0')
  const [currentValue, setCurrentValue] = useState<string>('0')
  const [previousValue, setPreviousValue] = useState<string>('')
  const [operation, setOperation] = useState<string | null>(null)
  const [shouldReset, setShouldReset] = useState<boolean>(false)

  const formatResult = (value: number): string => {
    if (!Number.isFinite(value)) return 'Error'

    const text = String(value)

    if (text.length <= 9) return text

    return value.toPrecision(9).replace(/\.?0+$/, '')
  }

  const handleNumberInput = (num: string): void => {
    if (shouldReset) {
      const nextValue = num === '.' ? '0.' : num
      setCurrentValue(nextValue)
      setDisplay(nextValue)
      setShouldReset(false)
      return
    }

    if (num === '.') {
      if (!currentValue.includes('.')) {
        const newValue = currentValue + '.'
        setCurrentValue(newValue)
        setDisplay(newValue)
      }
      return
    }

    if (currentValue === '0') {
      setCurrentValue(num)
      setDisplay(num)
      return
    }

    const newValue = currentValue + num
    setCurrentValue(newValue)
    setDisplay(newValue)
  }

  const handleFunction = (func: string): void => {
    switch (func) {
      case 'AC':
        setCurrentValue('0')
        setPreviousValue('')
        setOperation(null)
        setShouldReset(false)
        setDisplay('0')
        break

      case '+/−': {
        if (currentValue === '0') return
        const negated = formatResult(parseFloat(currentValue) * -1)
        setCurrentValue(negated)
        setDisplay(negated)
        break
      }

      case '%': {
        const percent = formatResult(parseFloat(currentValue) / 100)
        setCurrentValue(percent)
        setDisplay(percent)
        break
      }

      default:
        break
    }
  }

  const calculate = (prev: number, curr: number, op: string): number => {
    switch (op) {
      case '+':
        return prev + curr
      case '−':
        return prev - curr
      case '×':
        return prev * curr
      case '÷':
        return curr === 0 ? NaN : prev / curr
      default:
        return curr
    }
  }

  const handleOperator = (op: string): void => {
    if (op === '=') {
      if (operation && previousValue !== '') {
        const result = formatResult(
          calculate(parseFloat(previousValue), parseFloat(currentValue), operation)
        )
        setCurrentValue(result)
        setDisplay(result)
        setOperation(null)
        setPreviousValue('')
        setShouldReset(true)
      }
      return
    }

    if (operation && previousValue !== '' && !shouldReset) {
      const result = formatResult(
        calculate(parseFloat(previousValue), parseFloat(currentValue), operation)
      )
      setCurrentValue(result)
      setDisplay(result)
      setPreviousValue(result)
    } else {
      setPreviousValue(currentValue)
    }

    setOperation(op)
    setShouldReset(true)
  }

  return (
    <div className="app">
      <div className="calculator">
        <div className="display">{display}</div>

        <div className="buttons">
          <div className="button-row">
            <button className="btn btn-function" onClick={() => handleFunction('AC')}>AC</button>
            <button
              className="btn btn-function btn-plusminus"
              onClick={() => handleFunction('+/−')}
            >
              <span className="pm">
                <span className="p">+</span>
                <span className="s">/</span>
                <span className="m">−</span>
              </span>
            </button>
            <button className="btn btn-function" onClick={() => handleFunction('%')}>%</button>
            <button className={`btn btn-operator ${operation === '÷' ? 'btn-operator-active' : ''}`} onClick={() => handleOperator('÷')}>÷</button>
          </div>

          <div className="button-row">
            <button className="btn btn-number" onClick={() => handleNumberInput('7')}>7</button>
            <button className="btn btn-number" onClick={() => handleNumberInput('8')}>8</button>
            <button className="btn btn-number" onClick={() => handleNumberInput('9')}>9</button>
            <button className={`btn btn-operator ${operation === '×' ? 'btn-operator-active' : ''}`} onClick={() => handleOperator('×')}>×</button>
          </div>

          <div className="button-row">
            <button className="btn btn-number" onClick={() => handleNumberInput('4')}>4</button>
            <button className="btn btn-number" onClick={() => handleNumberInput('5')}>5</button>
            <button className="btn btn-number" onClick={() => handleNumberInput('6')}>6</button>
            <button className={`btn btn-operator ${operation === '−' ? 'btn-operator-active' : ''}`} onClick={() => handleOperator('−')}>−</button>
          </div>

          <div className="button-row">
            <button className="btn btn-number" onClick={() => handleNumberInput('1')}>1</button>
            <button className="btn btn-number" onClick={() => handleNumberInput('2')}>2</button>
            <button className="btn btn-number" onClick={() => handleNumberInput('3')}>3</button>
            <button className={`btn btn-operator ${operation === '+' ? 'btn-operator-active' : ''}`} onClick={() => handleOperator('+')}>+</button>
          </div>

          <div className="button-row last-row">
            <button className="btn btn-number btn-zero" onClick={() => handleNumberInput('0')}>0</button>
            <button className="btn btn-number" onClick={() => handleNumberInput('.')}>.</button>
            <button className="btn btn-operator" onClick={() => handleOperator('=')}>=</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App