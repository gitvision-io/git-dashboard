import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { sign, verify } from "jsonwebtoken";
import { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt";
import { getInstance, setToken } from "../../../services/api";
import { SESSION_COOKIE_NAME } from "../../../common/constants";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          // I wish to request additional permission scopes.
          scope: "repo read:user user:email read:org",
        },
      },
    }),
    // ...add more providers here
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      const signedToken = sign(token!, process.env.NEXTAUTH_SECRET!);
      setToken(signedToken);

      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        await getInstance().put(`/api/users/me`, {
          avatarUrl: profile?.avatar_url,
          email: profile?.email,
          name: profile?.name,
          githubToken: account.access_token,
          githubId: profile?.id,
        });
      }
      return token;
    },
  },
  jwt: {
    encode(params: JWTEncodeParams): Promise<string> {
      // return a custom encoded JWT string
      return Promise.resolve(sign(params.token!, process.env.NEXTAUTH_SECRET!));
    },
    decode(params: JWTDecodeParams): Promise<JWT | null> {
      // return a `JWT` object, or `null` if decoding failed
      const jwt = verify(params.token!, process.env.NEXTAUTH_SECRET!) as any;
      return Promise.resolve({
        name: jwt.name,
        email: jwt.email,
        picture: jwt.picture,
        sub: jwt.sub,
        state: jwt.state,
        iat: jwt.iat,
      } as JWT);
    },
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        domain: "localhost",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
export default NextAuth(authOptions);
