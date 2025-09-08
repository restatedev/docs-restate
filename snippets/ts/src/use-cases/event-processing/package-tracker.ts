import * as restate from "@restatedev/restate-sdk";
import { handlers, TerminalError } from "@restatedev/restate-sdk";
import shared = handlers.object.shared;

type PackageInfo = {
  locations?: LocationUpdate[];
};

class LocationUpdate {}

// <start_here>
const packageTracker = restate.object({
  name: "package-tracker",
  handlers: {
    registerPackage: async (
      ctx: restate.ObjectContext,
      packageInfo: PackageInfo
    ) => {
      ctx.set("package-info", packageInfo);
    },

    updateLocation: async (
      ctx: restate.ObjectContext,
      locationUpdate: LocationUpdate
    ) => {
      const packageInfo = await ctx.get<PackageInfo>("package-info");
      if (!packageInfo) {
        throw new TerminalError(`Package not found`);
      }

      (packageInfo.locations ??= []).push(locationUpdate);
      ctx.set("package-info", packageInfo);
    },

    getPackageInfo: shared(async (ctx: restate.ObjectSharedContext) =>
      ctx.get<PackageInfo>("package-info")
    ),
  },
});
// <end_here>
