import { useMemo } from 'react';
import { useAllMeals } from '@/lib/hooks/useMeals';
import { useUserSettings } from '@/lib/hooks/useUserSettings';
import { computeStats, type Stats } from '@/lib/insights/statistics';
import { getGestationalAge, daysUntilDueDate } from '@/lib/pregnancy/gestational-age';
import { Spinner } from '@/components/ui/Loading';
import { Card } from '@/components/ui/Card';
import { Droplet, Footprints, Apple, TrendingUp, Baby } from 'lucide-react';
import type { MealWithRelations } from '@/lib/types';

function StatRow({ label, stats, unit }: { label: string; stats: Stats; unit: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-sm font-semibold text-stone-700">
        {stats.average} {unit}
        <span className="text-xs text-stone-400 font-normal ml-2">
          (n={stats.n}, {stats.min}–{stats.max})
        </span>
      </span>
    </div>
  );
}

function InsightCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-3">
        {icon}
        {title}
      </h3>
      {children}
    </Card>
  );
}

export function InsightsScreen() {
  const { meals, loading } = useAllMeals();
  const { settings } = useUserSettings();

  const insights = useMemo(() => {
    const mealsWithGlucose = meals.filter((m) => m.glucose_1h_mg_dl !== null);

    // Per-category glucose stats
    const byCarbFamily: Record<string, number[]> = {};
    for (const meal of mealsWithGlucose) {
      for (const carb of meal.meal_carbs) {
        if (!carb.food) continue;
        const categoryName = carb.food.category.name;
        if (!byCarbFamily[categoryName]) byCarbFamily[categoryName] = [];
        byCarbFamily[categoryName].push(meal.glucose_1h_mg_dl!);
      }
    }

    // Per-fruit glucose stats
    const byFruit: Record<string, number[]> = {};
    for (const meal of mealsWithGlucose) {
      for (const carb of meal.meal_carbs) {
        if (carb.food?.category.name === 'Fruit') {
          if (!byFruit[carb.food.name]) byFruit[carb.food.name] = [];
          byFruit[carb.food.name].push(meal.glucose_1h_mg_dl!);
        }
      }
    }

    // Per-carb-food-and-quantity glucose stats (dose-response)
    const byCarbAmount: Record<string, number[]> = {};
    for (const meal of mealsWithGlucose) {
      for (const carb of meal.meal_carbs) {
        if (!carb.food || carb.quantity == null) continue;
        const label = carb.unit
          ? `${carb.food.name} (${carb.quantity} ${carb.unit})`
          : `${carb.food.name} (${carb.quantity})`;
        if (!byCarbAmount[label]) byCarbAmount[label] = [];
        byCarbAmount[label].push(meal.glucose_1h_mg_dl!);
      }
    }

    // Walking vs non-walking
    const walked = mealsWithGlucose.filter((m) => m.walked_after).map((m) => m.glucose_1h_mg_dl!);
    const notWalked = mealsWithGlucose.filter((m) => !m.walked_after).map((m) => m.glucose_1h_mg_dl!);

    // Same-meal comparison: meals with same main_meal name
    const byMainMeal: Record<string, { walked: number[]; notWalked: number[] }> = {};
    for (const meal of mealsWithGlucose) {
      if (!meal.main_meal) continue;
      const key = meal.main_meal.toLowerCase();
      if (!byMainMeal[key]) byMainMeal[key] = { walked: [], notWalked: [] };
      if (meal.walked_after) byMainMeal[key].walked.push(meal.glucose_1h_mg_dl!);
      else byMainMeal[key].notWalked.push(meal.glucose_1h_mg_dl!);
    }

    // Pairing presence vs absence
    const withPairing = mealsWithGlucose
      .filter((m) => m.meal_pairings.length > 0)
      .map((m) => m.glucose_1h_mg_dl!);
    const withoutPairing = mealsWithGlucose
      .filter((m) => m.meal_pairings.length === 0)
      .map((m) => m.glucose_1h_mg_dl!);

    // Effect of each pairing category (Fat/Protein/Fiber) individually
    const pairingCategoryNames = ['Fat', 'Protein', 'Fiber'];
    const byPairingCategory: Record<string, { with: number[]; without: number[] }> = {};
    for (const name of pairingCategoryNames) {
      byPairingCategory[name] = { with: [], without: [] };
    }
    for (const meal of mealsWithGlucose) {
      const presentCategories = new Set(
        meal.meal_pairings.filter((p) => p.food).map((p) => p.food!.category.name)
      );
      for (const name of pairingCategoryNames) {
        if (presentCategories.has(name)) {
          byPairingCategory[name].with.push(meal.glucose_1h_mg_dl!);
        } else {
          byPairingCategory[name].without.push(meal.glucose_1h_mg_dl!);
        }
      }
    }

    return {
      byCarbFamily,
      byFruit,
      byCarbAmount,
      walked: computeStats(walked),
      notWalked: computeStats(notWalked),
      byMainMeal,
      withPairing: computeStats(withPairing),
      withoutPairing: computeStats(withoutPairing),
      byPairingCategory,
      totalMeals: meals.length,
      mealsWithGlucose: mealsWithGlucose.length,
    };
  }, [meals]);

  const gestationalAge = useMemo(() => {
    if (!settings?.pregnancy_edd) return null;
    return getGestationalAge(new Date(), new Date(settings.pregnancy_edd));
  }, [settings?.pregnancy_edd]);

  const daysLeft = useMemo(() => {
    if (!settings?.pregnancy_edd) return null;
    return daysUntilDueDate(new Date(settings.pregnancy_edd));
  }, [settings?.pregnancy_edd]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const postmealTarget = settings?.postmeal_1h_target_max ?? 140;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-800">Insights</h1>

      {insights.totalMeals === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
          <TrendingUp className="mx-auto text-stone-300 mb-2" size={32} />
          <p className="text-stone-400 text-sm">No meals logged yet. Start logging to see insights.</p>
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-stone-400 mb-1">Total meals</p>
              <p className="text-2xl font-bold text-stone-700">{insights.totalMeals}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-stone-400 mb-1">With glucose data</p>
              <p className="text-2xl font-bold text-stone-700">{insights.mealsWithGlucose}</p>
            </Card>
          </div>

          {/* Gestational age */}
          {gestationalAge && (
            <Card className="p-4 bg-gradient-to-br from-teal-50 to-stone-50 border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-teal-800 mb-1">
                    <Baby size={16} /> Gestational age
                  </h3>
                  <p className="text-2xl font-bold text-teal-700">{gestationalAge.formatted}</p>
                  <p className="text-xs text-teal-600 mt-0.5">
                    {gestationalAge.weeks} weeks, {gestationalAge.days} days
                  </p>
                </div>
                {daysLeft !== null && daysLeft > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-stone-400">Until due date</p>
                    <p className="text-lg font-bold text-stone-600">{daysLeft} days</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Walking effect */}
          {insights.walked && insights.notWalked && (
            <InsightCard title="Walking effect on glucose" icon={<Footprints size={16} className="text-teal-600" />}>
              <div className="space-y-1">
                <StatRow label="After walking" stats={insights.walked} unit="mg/dL" />
                <StatRow label="Without walking" stats={insights.notWalked} unit="mg/dL" />
              </div>
              {insights.walked.average < insights.notWalked.average && (
                <p className="text-xs text-teal-600 mt-2">
                  Walking lowered average glucose by{' '}
                  {(insights.notWalked.average - insights.walked.average).toFixed(1)} mg/dL
                </p>
              )}
            </InsightCard>
          )}

          {/* Carb family glucose */}
          {Object.keys(insights.byCarbFamily).length > 0 && (
            <InsightCard title="Glucose by carb type" icon={<Droplet size={16} className="text-teal-600" />}>
              <div className="space-y-1">
                {Object.entries(insights.byCarbFamily)
                  .sort((a, b) => computeStats(a[1])!.average - computeStats(b[1])!.average)
                  .map(([family, values]) => {
                    const stats = computeStats(values)!;
                    const isHigh = stats.average > postmealTarget;
                    return (
                      <div
                        key={family}
                        className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0"
                      >
                        <span className="text-sm text-stone-500">{family}</span>
                        <span
                          className={`text-sm font-semibold ${
                            isHigh ? 'text-amber-600' : 'text-stone-700'
                          }`}
                        >
                          {stats.average} mg/dL
                          <span className="text-xs text-stone-400 font-normal ml-2">(n={stats.n})</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </InsightCard>
          )}

          {/* Fruit glucose */}
          {Object.keys(insights.byFruit).length > 0 && (
            <InsightCard title="Glucose by fruit" icon={<Apple size={16} className="text-teal-600" />}>
              <div className="space-y-1">
                {Object.entries(insights.byFruit)
                  .sort((a, b) => computeStats(a[1])!.average - computeStats(b[1])!.average)
                  .map(([fruit, values]) => {
                    const stats = computeStats(values)!;
                    const isHigh = stats.average > postmealTarget;
                    return (
                      <div
                        key={fruit}
                        className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0"
                      >
                        <span className="text-sm text-stone-500">{fruit}</span>
                        <span
                          className={`text-sm font-semibold ${
                            isHigh ? 'text-amber-600' : 'text-stone-700'
                          }`}
                        >
                          {stats.average} mg/dL
                          <span className="text-xs text-stone-400 font-normal ml-2">(n={stats.n})</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </InsightCard>
          )}

          {/* Carb amount (dose-response) glucose */}
          {Object.keys(insights.byCarbAmount).length > 0 && (
            <InsightCard title="Glucose by carb amount" icon={<Droplet size={16} className="text-teal-600" />}>
              <div className="space-y-1">
                {Object.entries(insights.byCarbAmount)
                  .sort((a, b) => computeStats(a[1])!.average - computeStats(b[1])!.average)
                  .map(([label, values]) => {
                    const stats = computeStats(values)!;
                    const isHigh = stats.average > postmealTarget;
                    return (
                      <div
                        key={label}
                        className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0"
                      >
                        <span className="text-sm text-stone-500">{label}</span>
                        <span
                          className={`text-sm font-semibold ${
                            isHigh ? 'text-amber-600' : 'text-stone-700'
                          }`}
                        >
                          {stats.average} mg/dL
                          <span className="text-xs text-stone-400 font-normal ml-2">(n={stats.n})</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </InsightCard>
          )}

          {/* Pairing effect */}
          {insights.withPairing && insights.withoutPairing && (
            <InsightCard title="Effect of fat/protein pairings" icon={<TrendingUp size={16} className="text-teal-600" />}>
              <div className="space-y-1">
                <StatRow label="With pairings" stats={insights.withPairing} unit="mg/dL" />
                <StatRow label="Without pairings" stats={insights.withoutPairing} unit="mg/dL" />
              </div>
              {insights.withPairing.average < insights.withoutPairing.average && (
                <p className="text-xs text-teal-600 mt-2">
                  Pairings lowered average glucose by{' '}
                  {(insights.withoutPairing.average - insights.withPairing.average).toFixed(1)} mg/dL
                </p>
              )}
            </InsightCard>
          )}

          {/* Effect of each pairing category */}
          {Object.entries(insights.byPairingCategory)
            .filter(([, data]) => data.with.length > 0 && data.without.length > 0)
            .map(([category, data]) => {
              const withStats = computeStats(data.with)!;
              const withoutStats = computeStats(data.without)!;
              return (
                <InsightCard
                  key={category}
                  title={`Effect of ${category.toLowerCase()}`}
                  icon={<TrendingUp size={16} className="text-teal-600" />}
                >
                  <div className="space-y-1">
                    <StatRow label={`With ${category.toLowerCase()}`} stats={withStats} unit="mg/dL" />
                    <StatRow label={`Without ${category.toLowerCase()}`} stats={withoutStats} unit="mg/dL" />
                  </div>
                  {withStats.average < withoutStats.average && (
                    <p className="text-xs text-teal-600 mt-2">
                      {category} lowered average glucose by{' '}
                      {(withoutStats.average - withStats.average).toFixed(1)} mg/dL
                    </p>
                  )}
                </InsightCard>
              );
            })}

          {/* Same-meal walking comparison */}
          {Object.entries(insights.byMainMeal)
            .filter(([, data]) => data.walked.length > 0 && data.notWalked.length > 0)
            .slice(0, 5)
            .map(([meal, data]) => {
              const walkedStats = computeStats(data.walked)!;
              const notWalkedStats = computeStats(data.notWalked)!;
              return (
                <InsightCard
                  key={meal}
                  title={`Same meal: ${meal}`}
                  icon={<Footprints size={16} className="text-teal-600" />}
                >
                  <div className="space-y-1">
                    <StatRow label="After walking" stats={walkedStats} unit="mg/dL" />
                    <StatRow label="Without walking" stats={notWalkedStats} unit="mg/dL" />
                  </div>
                </InsightCard>
              );
            })}
        </>
      )}
    </div>
  );
}
