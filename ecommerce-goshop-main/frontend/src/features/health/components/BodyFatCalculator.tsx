import { useState } from "react";
import { api } from "../../../app/api";

export const BodyFatCalculator = () => {
    const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
    const [height, setHeight] = useState<string>("");
    const [neck, setNeck] = useState<string>("");
    const [waist, setWaist] = useState<string>("");
    const [hip, setHip] = useState<string>("");
    
    const [result, setResult] = useState<number | null>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setError("");
        setResult(null);
        if (!height || !neck || !waist || (gender === "FEMALE" && !hip)) {
            setError("Please fill in all required fields");
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.post("/health/bodyfat-calculate", {
                Gender: gender,
                HeightCm: parseFloat(height),
                NeckCm: parseFloat(neck),
                WaistCm: parseFloat(waist),
                HipCm: gender === "FEMALE" ? parseFloat(hip) : undefined
            });
            setResult(data.bodyFatPct);
        } catch (err: any) {
            setError(err?.response?.data?.message || "Calculation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto mt-6">
            <h2 className="text-xl font-bold mb-4">Body Fat Calculator (US Navy Method)</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                    <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Neck (cm)</label>
                    <input
                        type="number"
                        value={neck}
                        onChange={(e) => setNeck(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                        placeholder="Measure below larynx"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Waist (cm)</label>
                    <input
                        type="number"
                        value={waist}
                        onChange={(e) => setWaist(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                        placeholder={gender === "MALE" ? "At navel" : "Narrowest point"}
                    />
                </div>
                
                {gender === "FEMALE" && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hip (cm)</label>
                        <input
                            type="number"
                            value={hip}
                            onChange={(e) => setHip(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                            placeholder="Widest point"
                        />
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? "Calculating..." : "Calculate Body Fat %"}
                </button>

                {result !== null && (
                    <div className="mt-4 p-4 bg-gray-50 rounded text-center">
                        <p className="text-sm text-gray-500">Estimated Body Fat</p>
                        <p className="text-3xl font-bold text-indigo-600">{result}%</p>
                    </div>
                )}
            </div>
        </div>
    );
};