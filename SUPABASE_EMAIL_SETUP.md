# Supabase Email Template Configuration Guide

## Priority 1: Run the RLS Migration First! ⚠️

Before configuring email templates, you MUST run the new migration to fix the signup error:

### Run Migration 006

1. Open your **Supabase Dashboard**: https://app.supabase.com
2. Select your project: **casanovastudy**
3. Navigate to **SQL Editor** (left sidebar)
4. Click **+ New query**
5. Copy and paste the contents of [`supabase/migrations/006_fix_user_profiles_rls.sql`](supabase/migrations/006_fix_user_profiles_rls.sql)
6. Click **Run** or press `Cmd+Enter`
7. Verify it says "Success. No rows returned"

**What this fixes:** The RLS policy was blocking profile creation during signup because users aren't authenticated until they confirm their email. This migration relaxes the policy to allow profile creation.

---

## Priority 2: Configure Email Templates

Now that signups will work, let's configure the email templates properly.

### Step 1: Access Email Templates

1. Open **Supabase Dashboard**: https://app.supabase.com
2. Select your **casanovastudy** project
3. Navigate to **Authentication** → **Email Templates** (in the left sidebar under Authentication)

### Step 2: Configure "Confirm Signup" Template

This is the email sent when users create an account.

1. Select **"Confirm signup"** from the template dropdown
2. Update the template with the following:

**Subject Line:**
```
Confirm Your CasanovaStudy Account
```

**Message Body:**
```html
<h2>Welcome to CasanovaStudy!</h2>

<p>Hi there,</p>

<p>Thank you for signing up! We're excited to help you achieve your study goals.</p>

<p>Please confirm your email address by clicking the button below:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="background-color: #2563eb;
            color: white;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            display: inline-block;">
    Confirm Email Address
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p style="color: #6b7280; word-break: break-all;">{{ .ConfirmationURL }}</p>

<p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
  If you didn't create an account with CasanovaStudy, you can safely ignore this email.
</p>

<p style="margin-top: 30px;">
  Happy studying!<br>
  The CasanovaStudy Team
</p>
```

3. **Important:** Update the **Confirmation URL** redirect:
   - Scroll down to **URL Configuration**
   - Set **Redirect URL** to: `https://yourdomain.com/auth/confirm`
   - Or for local testing: `http://localhost:3000/auth/confirm`

4. Click **Save**

### Step 3: Configure "Magic Link" Template (Optional)

If you want to support passwordless login:

1. Select **"Magic Link"** from the dropdown
2. Update similarly with your branding
3. Set redirect URL to: `https://yourdomain.com/auth/callback`

### Step 4: Configure "Reset Password" Template

This is sent when users forget their password:

1. Select **"Reset Password"** from the dropdown
2. Update the template:

**Subject Line:**
```
Reset Your CasanovaStudy Password
```

**Message Body:**
```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your CasanovaStudy account.</p>

<p>Click the button below to create a new password:</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="background-color: #2563eb;
            color: white;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            display: inline-block;">
    Reset Password
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p style="color: #6b7280; word-break: break-all;">{{ .ConfirmationURL }}</p>

<p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
</p>

<p style="margin-top: 30px;">
  The CasanovaStudy Team
</p>
```

3. Set **Redirect URL** to: `https://yourdomain.com/auth/reset-password`
4. Click **Save**

---

## Priority 3: Configure SMTP (For Production)

By default, Supabase uses a limited email service that:
- ❌ Sends max 3 emails per hour
- ❌ May go to spam folders
- ❌ Has generic "from" address

For production, configure custom SMTP:

### Recommended Providers:
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 5,000 emails/month)
- **AWS SES** (Very cheap, pay-as-you-go)
- **Resend** (Great for developers)

### Configure SMTP in Supabase:

1. Navigate to **Project Settings** → **Auth**
2. Scroll down to **SMTP Settings**
3. Toggle **Enable Custom SMTP** to ON
4. Fill in your SMTP credentials:
   - **Host**: (from your provider)
   - **Port**: Usually 587 for TLS
   - **Username**: (from your provider)
   - **Password**: (from your provider)
   - **Sender email**: `noreply@casanovastudy.com`
   - **Sender name**: `CasanovaStudy`
5. Click **Save**

---

## Testing Your Email Flow

### Test 1: Sign Up
1. Visit your app (local or deployed)
2. Click "Sign up"
3. Fill out the form with a real email address you can access
4. Submit the form
5. ✅ Check that you receive the confirmation email
6. ✅ Click the confirmation link
7. ✅ Verify you're redirected to `/auth/confirm`
8. ✅ Verify the success page shows "Email Successfully Confirmed!"
9. ✅ Click "Start Studying!" and verify you're logged in

### Test 2: Password Reset
1. Go to sign-in page
2. Enter your email
3. Click "Forgot password?"
4. ✅ Check you receive the password reset email
5. ✅ Click the reset link
6. ✅ Set a new password
7. ✅ Sign in with the new password

---

## Troubleshooting

### "Email not receiving"
- **Check spam folder** - Supabase's default email often goes to spam
- **Check email quota** - Default limit is 3 emails/hour
- **Verify email template is enabled** - In Email Templates settings
- **Check Supabase logs** - Project Settings → API → Logs

### "Confirmation link broken"
- **Verify redirect URL** - Should match your domain exactly
- **Check for trailing slash** - `https://example.com` vs `https://example.com/`
- **Verify auth-gate.tsx** - Should allow `/auth/confirm` to bypass

### "Still getting RLS policy error"
- **Verify migration 006 ran successfully** - Check SQL Editor history
- **Clear browser cache** - Old sessions may interfere
- **Try different browser** - Rule out browser-specific issues
- **Check Supabase Dashboard → Table Editor** - Verify `user_profiles` table has correct policies

---

## Production Checklist

Before going live:

- [ ] Run migration `006_fix_user_profiles_rls.sql`
- [ ] Configure all email templates (Confirm, Reset Password)
- [ ] Set correct redirect URLs for production domain
- [ ] Set up custom SMTP provider
- [ ] Test full signup flow
- [ ] Test password reset flow
- [ ] Test on multiple email providers (Gmail, Outlook, etc.)
- [ ] Verify emails don't go to spam
- [ ] Add custom domain for sender email (optional but recommended)

---

## Next Steps

After email is working:
1. Test the complete user flow
2. Create your first study guide as a logged-in user
3. Verify it appears in "My Guides"
4. Test filtering and sorting
5. Share your first study guide with someone!
