import { Authenticator } from "remix-auth";
import { SocialsProvider, DiscordStrategy } from "remix-auth-socials";
import { sessionStorage } from "~/services/session.server";
import type { User } from "./models/user.server";
import { createUser, getUserByDiscordId } from "./models/user.server";

// Create an instance of the authenticator
export let authenticator = new Authenticator<User>(sessionStorage, {
  sessionKey: "_session",
});
// You may specify a <User> type which the strategies will return (this will be stored in the session)
// export let authenticator = new Authenticator<User>(sessionStorage, { sessionKey: '_session' });

authenticator.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_SECRET,
      callbackURL: `http://localhost:3000/auth/${SocialsProvider.DISCORD}/callback`,
      scope: ["identify", "guilds.members.read"],
    },
    async (props) => {
      // TODO: Extract guild ID out to an environmental variable? Some sort of global at least.
      const resGuildMember = await fetch(
        "https://discord.com/api/users/@me/guilds/214093545747906562/member",
        {
          headers: {
            Authorization: `${props.extraParams.token_type} ${props.accessToken}`,
          },
        }
      );
      const jsonGuild = await resGuildMember.json();
      if (!jsonGuild.joined_at) {
        throw new Error("Discord user not a member of server");
      }

      // TODO: Did you extract the guild ID to a global variable yet? Fix this then.
      const avatarPath = jsonGuild.avatar
        ? `guilds/214093545747906562/users/${props.profile.id}/avatars/${jsonGuild.avatar}.webp`
        : `avatars/${props.profile.id}/${props.profile.__json.avatar}.webp`;

      let user = await getUserByDiscordId(props.profile.id);
      if (!user) {
        user = await createUser(props.profile.id, jsonGuild.nick, avatarPath);
      }
      return user;
    }
  )
);
