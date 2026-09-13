# Sri Laxmi Sai Scientific Services Website

This is a static, mobile-friendly website for GitHub Pages, Netlify or Vercel.

## Included
- Home / Products / Services / About / Contact
- WhatsApp + phone buttons
- Product enquiry form
- Repair & Service Request form
- PDF/image upload field
- Google Maps section
- SEO meta tags
- Company brochure download
- Supabase-ready enquiry database
- Supabase-ready admin panel (`admin.html`)
- Supplied branding images and brochure

## Important
The website works without a backend by opening a pre-filled email. For the full Admin Panel + stored enquiries + attachments, connect Supabase using `config.js` and `supabase-schema.sql`.

## Deployment
Upload the contents of this folder to GitHub, Netlify or Vercel. No build command is needed.

## Supabase
1. Create a project.
2. Run `supabase-schema.sql` in SQL Editor.
3. Create a private Storage bucket called `service-attachments` and configure its upload policy.
4. Create your admin user in Supabase Authentication.
5. Copy Project URL and anon/publishable key into `config.js`.
6. Open `/admin.html` and log in.

Never put the Supabase service-role key in this website.
