declare module "@turf/distance" {
  import type { Feature, Point } from "geojson";
  function distance(
    from: Feature<Point> | number[],
    to: Feature<Point> | number[],
    options?: { units?: string },
  ): number;
  export default distance;
}

declare module "@turf/helpers" {
  import type { Feature, Point } from "geojson";
  export function point(coordinates: number[], properties?: Record<string, unknown>): Feature<Point>;
}
