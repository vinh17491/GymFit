import { Routes, Route } from "react-router-dom";
import { HealthProfileForm } from "../components/HealthProfileForm";
import { BMICalculator } from "../components/BMICalculator";
import { BodyFatCalculator } from "../components/BodyFatCalculator";
import { TrialManager } from "../components/TrialManager";

export const HealthRoutes = () => {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Health Tools & Profile</h1>
            <Routes>
                <Route path="" element={
                    <div className="space-y-8">
                        <TrialManager />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <BMICalculator />
                            <BodyFatCalculator />
                        </div>
                        <HealthProfileForm />
                    </div>
                } />
            </Routes>
        </div>
    );
};