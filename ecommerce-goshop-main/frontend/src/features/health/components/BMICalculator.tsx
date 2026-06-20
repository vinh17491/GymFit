import { useState } from "react";
import { useCalculateBMI } from "../api/healthApi";

export const BMICalculator = () => {
    const [height, setHeight] = useState<string>("");
    const [weight, setWeight] = useState<string>("");
    const [result, setResult] = useState<{ bmi: number, category: string } | null>(null);
    const [error, setError] = useState<string>("");
    const calcMutation = useCalculateBMI();

    const handleCalculate = async () => {
        setError("");
        setResult(null);
        if (!height || !weight) {
            setError("Please enter both height and weight");
            return;
        }

        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (isNaN(h) || isNaN(w)) {
            setError("Please enter valid numeric values");
            return;
        }
        if (h < 50 || h > 300) {
            setError("Height must be between 50 and 300 cm");
            return;
        }
        if (w < 10 || w > 500) {
            setError("Weight must be between 10 and 500 kg");
            return;
        }

        try {
            const data = await calcMutation.mutateAsync({
                HeightCm: parseFloat(height),
                WeightKg: parseFloat(weight)
            });
            setResult(data as any);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Calculation failed");
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">BMI Calculator</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                    <input
                        type="number"
                        min="1"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                        placeholder="e.g. 175"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                    <input
                        type="number"
                        min="1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                        placeholder="e.g. 70"
                    />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    onClick={handleCalculate}
                    disabled={calcMutation.isLoading}
                    className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                    {calcMutation.isLoading ? "Calculating..." : "Calculate"}
                </button>

                {result && (
                    <div className="mt-4 p-4 bg-gray-50 rounded text-center">
                        <p className="text-sm text-gray-500">Your BMI is</p>
                        <p className="text-3xl font-bold text-indigo-600">{result.bmi}</p>
                        <p className="text-lg font-medium mt-1">{result.category}</p>
                    </div>
                )}
            </div>
        </div>
    );
};