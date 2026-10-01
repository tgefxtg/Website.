# Turn on the secure package manager

The website code is ready. These one-time Netlify settings connect the private admin page to secure sign-in and saved package data.

1. Deploy this project to Netlify. The deployment root is the folder that contains the `Tourist Web` folder.
2. In Netlify, open **Project configuration** → **Environment variables** and add:
   - Key: `ADMIN_EMAIL`
   - Value: the real email address that should manage packages (for example, `yourname@gmail.com`).
3. Open **Identity** for the same Netlify project and select **Enable Identity**.
4. Set registration to **Invite only**. Invite the same email address used in `ADMIN_EMAIL`.
5. After the invite is accepted, open that Identity user, add the role `admin`, and save. Sign out and sign back in once so the role is refreshed.
6. Visit `https://your-domain.com/admin.html` and sign in. Add, edit, remove, and save packages there.

Only an account that both matches `ADMIN_EMAIL` and has the `admin` role can save package changes. Other people cannot create an account, access the editor, or call the save endpoint successfully.

The first save creates the package store automatically. The public website reads it on load and keeps its built-in package list as a fallback while Netlify is unavailable.
