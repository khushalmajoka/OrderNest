import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { useIsPhone } from "../../../common/hooks/useMediaQuery";

// What the orders list looks like while it is still loading: the same shape as
// the real table (or the cards on a phone).
const OrdersSkeleton = ({ rows = 6 }) => {
  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <SkeletonRegion label="Loading your orders" className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-white rounded-lg shadow border border-orange-100 p-4 mb-3">
            <div className="flex justify-between gap-3">
              <div className="space-y-2 w-1/2">
                <Bar className="h-3 w-1/3" />
                <Bar className="h-4 w-full" />
              </div>
              <Bar className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              <Bar className="h-4 w-2/3" />
              <Bar className="h-4 w-1/2" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Bar className="h-14" />
              <Bar className="h-14" />
              <Bar className="h-14" />
            </div>
            <Bar className="h-9 w-full mt-4" />
          </div>
        ))}
      </SkeletonRegion>
    );
  }

  const widths = ["w-28", "w-24", "w-28", "w-24", "w-14", "w-14", "w-20", "w-24"];
  return (
    <SkeletonRegion label="Loading your orders">
      <div className="border rounded shadow bg-white overflow-hidden">
        <div className="flex items-center gap-6 px-4 py-4 bg-orange-100">
          {widths.map((w, i) => (
            <Bar key={i} className={`h-3 ${w} bg-orange-300/70`} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-6 px-4 py-5 border-t">
            {widths.map((w, i) => (
              <Bar key={i} className={`h-3.5 ${w}`} />
            ))}
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
};

export default OrdersSkeleton;
