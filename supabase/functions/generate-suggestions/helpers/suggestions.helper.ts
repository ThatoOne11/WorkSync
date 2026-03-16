export type ProjectVarianceData = {
  name: string;
  loggedHours: number;
  targetHours: number;
  variance: number;
};

export class SuggestionsHelper {
  static formatWeekendSuggestions(
    projectsData: ProjectVarianceData[],
  ): string[] {
    const suggestions = ["<strong>This Week's Performance Review: </strong>"];

    projectsData.forEach((p) => {
      const varianceAbs = Math.abs(p.variance);

      if (p.targetHours > 0 && varianceAbs > 0.1 * p.targetHours) {
        if (p.variance > 0) {
          suggestions.push(
            `🟢 <strong>${p.name}</strong>: You logged ${p.loggedHours.toFixed(1)} hours, exceeding your weekly target of ${p.targetHours.toFixed(1)} hours by ${varianceAbs.toFixed(1)} hours. Great dedication, but ensure you manage your pace.<br><br>`,
          );
        } else {
          suggestions.push(
            `🔴 <strong>${p.name}</strong>: You logged ${p.loggedHours.toFixed(1)} hours, falling short of your weekly target of ${p.targetHours.toFixed(1)} hours by ${varianceAbs.toFixed(1)} hours. Prioritize this project next week.<br><br>`,
          );
        }
      } else if (p.loggedHours > 0) {
        suggestions.push(
          `🟡 <strong>${p.name}</strong>: You were right on pace! Logged ${p.loggedHours.toFixed(1)} hours (Target: ${p.targetHours.toFixed(1)} hours). Keep this consistent next week.<br><br>`,
        );
      }
    });

    if (suggestions.length <= 1) {
      suggestions.push(
        'All projects were either on pace or had no time logged this week. Good work on maintaining balance!',
      );
    }

    return suggestions;
  }

  static formatWeekdaySuggestions(
    projectsData: ProjectVarianceData[],
  ): string[] {
    const suggestions: string[] = [];

    const highVarianceProjects = projectsData
      .filter((p) => Math.abs(p.variance) > p.targetHours * 0.1)
      .sort((a, b) => b.variance - Math.abs(a.variance));

    const hot = highVarianceProjects.filter((p) => p.variance > 0);
    const cold = highVarianceProjects.filter((p) => p.variance < 0);

    if (hot.length > 0 && cold.length > 0) {
      suggestions.push(
        `You are on track to go over by ${hot[0].variance.toFixed(1)} hours on <strong>${hot[0].name}</strong>. Consider shifting focus to <strong>${cold[0].name}</strong>, which is currently tracking under budget.`,
      );
    } else if (hot.length > 0) {
      suggestions.push(
        `You are working too much on <strong>${hot[0].name}</strong> and are projected to exceed your hours by ${hot[0].variance.toFixed(1)} hours. Slow down buddy lol 😂.`,
      );
    } else if (cold.length > 0) {
      suggestions.push(
        `You are currently behind schedule on <strong>${cold[0].name}</strong> and are projected to be ${Math.abs(cold[0].variance).toFixed(1)} hours under target. Consider allocating more time here soon.`,
      );
    } else {
      suggestions.push(
        'Great work! Your pacing across all projects is balanced and on track to meet your monthly targets.',
      );
    }

    return suggestions;
  }
}
