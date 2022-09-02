import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import z from "zod";

import { createNflTeams } from "~/models/nflteam.server";
import type { PlayerCreate } from "~/models/players.server";
import { upsertPlayer } from "~/models/players.server";

import Alert from "~/components/ui/Alert";
import Button from "~/components/ui/Button";
import { syncNflGameWeek } from "~/libs/syncs.server";
import { authenticator, requireAdmin } from "~/services/auth.server";
import { CURRENT_YEAR } from "~/utils/constants";

type ActionData = {
  formError?: string;
  fieldErrors?: {
    url: string | undefined;
  };
  fields?: {
    url: string;
  };
  message?: string;
};

const sleeperJsonNflPlayers = z.record(
  z.object({
    team: z.string().nullable(),
    position: z.string().nullable(),
    player_id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    full_name: z.string().optional(),
  })
);
type SleeperJsonNflPlayers = z.infer<typeof sleeperJsonNflPlayers>;

export const action = async ({ request }: ActionArgs) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  requireAdmin(user);

  const formData = await request.formData();
  const action = formData.get("_action");

  switch (action) {
    case "resyncNflPlayers": {
      const sleeperLeagueRes = await fetch(
        `https://api.sleeper.app/v1/players/nfl`
      );
      const sleeperJson: SleeperJsonNflPlayers = sleeperJsonNflPlayers.parse(
        await sleeperLeagueRes.json()
      );

      const promises: Promise<PlayerCreate>[] = [];
      for (const [
        sleeperId,
        { position, first_name, last_name, full_name, team },
      ] of Object.entries(sleeperJson)) {
        const player: PlayerCreate = {
          sleeperId,
          position: position,
          firstName: first_name,
          lastName: last_name,
          fullName: full_name || `${first_name} ${last_name}`,
          nflTeam: team,
        };
        promises.push(upsertPlayer(player));
      }
      await Promise.all(promises);

      return json<ActionData>({ message: "NFL Players have been updated." });
    }
    case "resyncNflGames": {
      // Set up teams (this needs to be optimized to not do this)
      await createNflTeams();

      // The array one-liner there makes an array of numbers from 1 to 18.
      await syncNflGameWeek(
        CURRENT_YEAR,
        Array.from({ length: 18 }, (_, i) => i + 1)
      );

      return json<ActionData>({ message: "NFL Games have been updated." });
    }
  }

  return json<ActionData>({ message: "Nothing was updated." });
};

export const loader = async ({ request }: LoaderArgs) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  requireAdmin(user);

  return {};
};

export default function AdminDataIndex() {
  const actionData = useActionData<ActionData>();
  const transition = useTransition();

  return (
    <>
      <h2>Data Updates</h2>
      <p>This is a good list of things to eventually automate.</p>
      {actionData?.message && <Alert message={actionData.message} />}
      <Form method="post">
        <section>
          <h3>Update NFL Games</h3>
          <p>
            This will resync all NFL games in the system. This should probably
            be run on Monday nights late or maybe Tuesday morning.
          </p>
          {actionData?.formError ? (
            <p className="form-validation-error" role="alert">
              {actionData.formError}
            </p>
          ) : null}
          <Button
            type="submit"
            name="_action"
            value="resyncNflGames"
            disabled={transition.state !== "idle"}
          >
            Resync NFL Games
          </Button>
        </section>
        <section>
          <h3>Update NFL Players Database</h3>
          <p>
            This will resync all NFL players in the system. You only really need
            to do this if there's a player that's not showing up for some
            reason, or if a player gets traded. Definitely not more than once a
            day, and rarely even once a week. This command won't actually run on
            production because of memory issues, currently you need to run it on
            dev and sync the database table manually. Purging the promise table
            after every 50ish players might be a better idea.
          </p>
          {actionData?.formError ? (
            <p className="form-validation-error" role="alert">
              {actionData.formError}
            </p>
          ) : null}
          <Button
            type="submit"
            name="_action"
            value="resyncNflPlayers"
            disabled={transition.state !== "idle"}
          >
            Resync NFL Players
          </Button>
        </section>
      </Form>
    </>
  );
}
