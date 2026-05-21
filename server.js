const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const { Resend } = require("resend");

require('dotenv').config();

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// --- PUBLIC APIs ---

app.post('/api/v1/contact', async (req, res) => {

  const { name, email, mobileNumber, message } = req.body;

  try {

    // =========================
    // EMAIL TO ADMIN / COMPANY
    // =========================

    await resend.emails.send({
      from: 'Travel Website <onboarding@resend.dev>',
      to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,

      reply_to: email,

      subject: `🌍 New Travel Inquiry from ${name}`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          background-color: #f4f7fb;
          padding: 30px;
        ">

          <div style="
            max-width: 650px;
            margin: auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          ">

            <div style="
              background: linear-gradient(90deg, #ff7b00, #ffb347);
              padding: 25px;
              text-align: center;
              color: white;
            ">
              <h1>✈️ New Travel Inquiry</h1>
            </div>

            <div style="padding: 30px;">

              <p><strong>👤 Name:</strong> ${name}</p>

              <p><strong>📧 Email:</strong> ${email}</p>

              <p><strong>📱 Phone:</strong> ${mobileNumber}</p>

              <div style="
                background: #f9fafc;
                padding: 18px;
                border-left: 4px solid #ff7b00;
                border-radius: 8px;
                margin-top: 20px;
              ">
                ${message}
              </div>

            </div>

          </div>

        </div>
      `
    });

    // =========================
    // AUTO REPLY TO CUSTOMER
    // =========================

    await resend.emails.send({
      from: 'Travel Website <onboarding@resend.dev>',
      to: email,

      subject: `✨ We Received Your Travel Inquiry`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          background-color: #f4f7fb;
          padding: 30px;
        ">

          <div style="
            max-width: 650px;
            margin: auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          ">

            <div style="
              background: linear-gradient(90deg, #ff7b00, #ffb347);
              padding: 30px;
              text-align: center;
              color: white;
            ">
              <h1>✈️ Thank You for Contacting Us!</h1>
            </div>

            <div style="
              padding: 35px;
              color: #333;
              line-height: 1.8;
            ">

              <h2>Hello ${name},</h2>

              <p>
                Thank you for reaching out to us.
                We have successfully received your inquiry.
              </p>

              <div style="
                margin-top: 25px;
                background: #f9fafc;
                border-left: 4px solid #ff7b00;
                padding: 20px;
                border-radius: 8px;
              ">

                <h3>📝 Your Query</h3>

                <p><strong>Name:</strong> ${name}</p>

                <p><strong>Email:</strong> ${email}</p>

                <p><strong>Phone:</strong> ${mobileNumber}</p>

                <p><strong>Message:</strong> ${message}</p>

              </div>

            </div>

          </div>

        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: 'Query sent successfully'
    });

  } catch (error) {

    console.error("Email sending failed:", error);

    return res.status(500).json({
      success: false,
      message: 'Failed to send query'
    });
  }
});

// Cloudinary vs Local Storage Fallback Configuration
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here' &&
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_KEY !== 'your_api_key_here' &&
  process.env.CLOUDINARY_API_SECRET && 
  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret_here';

let storage;

if (isCloudinaryConfigured) {
  console.log("Cloudinary credentials detected. Using Cloudinary storage.");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'tourAndTravels',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
  });
} else {
  console.log("Cloudinary is NOT configured. Falling back to local disk storage.");
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({ storage: storage });

// File Paths
const DATA_DIR = path.join(__dirname, 'Data');
const DESTINATIONS_FILE = path.join(DATA_DIR, 'destinations.json');
const TOURS_FILE = path.join(DATA_DIR, 'tours_test.json');
const TOUR_DETAILS_FILE = path.join(DATA_DIR, 'tour_details.json');

// Helper functions for reading/writing JSON
const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// --- AUTH ---
app.post('/api/auth/login', (req, res) => {
  console.log("Login attempt:", req.body);
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();
  if (username === 'seea' && password === 'seea@02') {
    res.json({ status: 200, data: 'dummy-admin-token-123', message: 'Logged in successfully' });
  } else {
    res.status(401).json({ status: 401, message: 'Invalid username or password' });
  }
});

// --- PUBLIC GET DATA ---
app.get('/api/destinations', (req, res) => {
  res.json(readJson(DESTINATIONS_FILE) || { status: 200, data: [] });
});

app.get('/api/destinations/:destId/tours', (req, res) => {
  const tours = readJson(TOURS_FILE) || {};
  res.json(tours[req.params.destId] || { status: 200, data: { content: [] } });
});

app.get('/api/tours/:slug', (req, res) => {
  const details = readJson(TOUR_DETAILS_FILE) || {};
  res.json({ status: 200, data: details[req.params.slug] || null });
});

// --- GET DATA ---
app.get('/api/admin/content/destinations', (req, res) => {
  res.json(readJson(DESTINATIONS_FILE) || { status: 200, data: [] });
});

app.get('/api/admin/content/tours/:destId', (req, res) => {
  const tours = readJson(TOURS_FILE) || {};
  res.json(tours[req.params.destId] || { status: 200, data: { content: [] } });
});

app.get('/api/admin/content/tour-details/:slug', (req, res) => {
  const details = readJson(TOUR_DETAILS_FILE) || {};
  res.json({ status: 200, data: details[req.params.slug] || null });
});

app.get('/api/admin/content/dashboard-summary', (req, res) => {
  const destinations = readJson(DESTINATIONS_FILE) || { data: [] };
  const totalDestinations = destinations.data ? destinations.data.length : 0;
  
  const tours = readJson(TOURS_FILE) || {};
  let totalTours = 0;
  Object.values(tours).forEach(destObj => {
    let contentList = [];
    if (destObj.data && Array.isArray(destObj.data.content)) {
      contentList = destObj.data.content;
    } else if (destObj.data && Array.isArray(destObj.data)) {
      contentList = destObj.data;
    } else if (Array.isArray(destObj.content)) {
      contentList = destObj.content;
    }
    totalTours += contentList.length;
  });

  const tourDetails = readJson(TOUR_DETAILS_FILE) || {};
  let totalReviews = 0;
  Object.values(tourDetails).forEach(detail => {
    if (detail && Array.isArray(detail.reviews)) {
      totalReviews += detail.reviews.length;
    }
  });

  res.json({
    status: 200,
    data: {
      totalTours,
      totalDestinations,
      totalReviews,
      pendingReviews: 0,
      totalBookings: 0,
      totalUserQueries: 0
    }
  });
});
// --- DESTINATIONS ---
app.post('/api/admin/content/destinations', (req, res) => {
  const payload = req.body;
  const destinations = readJson(DESTINATIONS_FILE) || { status: 200, data: [] };
  
  // Find the highest existing ID to auto-increment
  let maxId = 0;
  destinations.data.forEach(d => {
    const currentId = parseInt(d.id, 10);
    if (!isNaN(currentId) && currentId > maxId) {
      maxId = currentId;
    }
  });
  
  const newId = String(maxId + 1);
  
  const newDest = {
    id: parseInt(newId, 10),
    internalId: newId,
    name: payload.label,
    label: payload.label,
    isFeatured: payload.isFeatured,
    iconUrl: payload.iconUrl || '',
    bannerUrl: payload.bannerUrl || ''
  };

  destinations.data.push(newDest);
  writeJson(DESTINATIONS_FILE, destinations);
  res.json({ status: 200, message: 'Destination created', data: newDest });
});

app.put('/api/admin/content/destinations/:id', (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const destinations = readJson(DESTINATIONS_FILE);
  
  let found = false;
  destinations.data = destinations.data.map(d => {
    if (String(d.id) === String(id) || d.internalId === id) {
      found = true;
      return {
        ...d,
        name: payload.label,
        label: payload.label,
        isFeatured: payload.isFeatured,
        iconUrl: payload.iconUrl || d.iconUrl,
        bannerUrl: payload.bannerUrl || d.bannerUrl
      };
    }
    return d;
  });

  if (found) {
    writeJson(DESTINATIONS_FILE, destinations);
    res.json({ status: 200, message: 'Destination updated' });
  } else {
    res.status(404).json({ status: 404, message: 'Destination not found' });
  }
});

app.delete('/api/admin/content/destinations/:id', (req, res) => {
  const { id } = req.params;
  const destinations = readJson(DESTINATIONS_FILE);
  
  destinations.data = destinations.data.filter(d => String(d.id) !== String(id) && d.internalId !== id);
  writeJson(DESTINATIONS_FILE, destinations);
  res.json({ status: 200, message: 'Destination deleted' });
});

app.post('/api/admin/content/destinations/:id/icon', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const imageUrl = isCloudinaryConfigured ? req.file.path : `/public/uploads/${req.file.filename}`;
  
  // Save to destinations.json
  const { id } = req.params;
  const destinations = readJson(DESTINATIONS_FILE);
  if (destinations && destinations.data) {
    let found = false;
    destinations.data = destinations.data.map(d => {
      if (String(d.id) === String(id) || d.internalId === id) {
        d.iconUrl = imageUrl;
        found = true;
      }
      return d;
    });
    if (found) {
      writeJson(DESTINATIONS_FILE, destinations);
    }
  }
  
  res.json({ status: 200, message: 'Icon uploaded', data: imageUrl });
});

app.post('/api/admin/content/destinations/:id/banner', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const imageUrl = isCloudinaryConfigured ? req.file.path : `/public/uploads/${req.file.filename}`;
  
  // Save to destinations.json
  const { id } = req.params;
  const destinations = readJson(DESTINATIONS_FILE);
  if (destinations && destinations.data) {
    let found = false;
    destinations.data = destinations.data.map(d => {
      if (String(d.id) === String(id) || d.internalId === id) {
        d.bannerUrl = imageUrl;
        found = true;
      }
      return d;
    });
    if (found) {
      writeJson(DESTINATIONS_FILE, destinations);
    }
  }
  
  res.json({ status: 200, message: 'Banner uploaded', data: imageUrl });
});

// --- TOURS ---
app.post('/api/admin/content/tours', (req, res) => {
  const payload = req.body;
  const tours = readJson(TOURS_FILE) || {};
  const destId = payload.destinationId;

  if (!tours[destId]) {
    tours[destId] = { status: 200, data: { content: [] } };
  }
  
  // Find the highest existing tourId across all destinations to auto-increment
  let maxTourId = 0;
  Object.values(tours).forEach(destObj => {
    let contentList = [];
    if (destObj.data && Array.isArray(destObj.data.content)) {
      contentList = destObj.data.content;
    } else if (destObj.data && Array.isArray(destObj.data)) {
      contentList = destObj.data;
    } else if (Array.isArray(destObj.content)) {
      contentList = destObj.content;
    }
    contentList.forEach(t => {
      const currentId = parseInt(t.tourId || t.id, 10);
      if (!isNaN(currentId) && currentId > maxTourId) {
        maxTourId = currentId;
      }
    });
  });

  const newTourId = maxTourId + 1;
  
  const newTour = {
    tourId: newTourId,
    ...payload,
    price: payload.startingPrice
  };

  tours[destId].data.content.push(newTour);
  writeJson(TOURS_FILE, tours);
  res.json({ status: 200, message: 'Tour created', data: newTour });
});

app.put('/api/admin/content/tours/:id', (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const tours = readJson(TOURS_FILE);
  
  // Find and update the tour in whichever destination it belongs to
  let found = false;
  for (const destId in tours) {
    if (tours[destId] && tours[destId].data && tours[destId].data.content) {
      tours[destId].data.content = tours[destId].data.content.map(t => {
        if (String(t.tourId) === String(id) || String(t.id) === String(id)) {
          found = true;
          return { ...t, ...payload, price: payload.startingPrice };
        }
        return t;
      });
    }
  }

  if (found) {
    writeJson(TOURS_FILE, tours);
    res.json({ status: 200, message: 'Tour updated' });
  } else {
    res.status(404).json({ status: 404, message: 'Tour not found' });
  }
});

app.delete('/api/admin/content/tours/:id', (req, res) => {
  const { id } = req.params;
  const tours = readJson(TOURS_FILE);
  
  for (const destId in tours) {
    if (tours[destId] && tours[destId].data && tours[destId].data.content) {
      tours[destId].data.content = tours[destId].data.content.filter(t => String(t.tourId) !== String(id) && String(t.id) !== String(id));
    }
  }
  
  writeJson(TOURS_FILE, tours);
  res.json({ status: 200, message: 'Tour deleted' });
});

app.put('/api/admin/content/tours/:id/full-content', (req, res) => {
  const { id } = req.params;
  const payload = req.body;
  const tourDetails = readJson(TOUR_DETAILS_FILE) || {};

  // In tourDetails, the keys are slugs. We need to find the slug for this ID.
  // Alternatively, we can just look through all tours to find the matching ID.
  let slugToUpdate = null;
  for (const slug in tourDetails) {
    const t = tourDetails[slug];
    if (String(t.id) === String(id) || String(t.tourId) === String(id) || String(t._id) === String(id)) {
      slugToUpdate = slug;
      break;
    }
  }

  if (slugToUpdate) {
    tourDetails[slugToUpdate] = {
      ...tourDetails[slugToUpdate],
      ...payload
    };
    writeJson(TOUR_DETAILS_FILE, tourDetails);
    res.json({ status: 200, message: 'Tour content updated' });
  } else {
    // If not found in tourDetails, it might be a newly created tour that hasn't been cached yet.
    // We would need the slug to create it. For now, try to find the slug from the Tours file.
    const tours = readJson(TOURS_FILE);
    let foundSlug = null;
    let tourBase = null;
    for (const destId in tours) {
      const ts = tours[destId]?.data?.content || [];
      const match = ts.find(t => String(t.tourId) === String(id) || String(t.id) === String(id));
      if (match) {
        foundSlug = match.slug;
        tourBase = match;
        break;
      }
    }
    
    if (foundSlug) {
      tourDetails[foundSlug] = {
        ...tourBase,
        ...payload
      };
      writeJson(TOUR_DETAILS_FILE, tourDetails);
      res.json({ status: 200, message: 'Tour content created and updated' });
    } else {
      res.status(404).json({ status: 404, message: 'Tour not found to attach content to' });
    }
  }
});

app.post('/api/admin/content/tours/:id/images', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const imageUrl = isCloudinaryConfigured ? req.file.path : `/public/uploads/${req.file.filename}`;
  
  // Save cover image to tours_test.json AND tour_details.json
  const { id } = req.params;
  
  // 1. Update in tours_test.json
  const toursObj = readJson(TOURS_FILE) || {};
  let foundInTours = false;
  for (const destId in toursObj) {
    const list = toursObj[destId]?.data?.content || [];
    toursObj[destId].data.content = list.map(t => {
      if (String(t.tourId) === String(id) || String(t.id) === String(id)) {
        t.coverImage = imageUrl;
        foundInTours = true;
      }
      return t;
    });
  }
  if (foundInTours) {
    writeJson(TOURS_FILE, toursObj);
  }
  
  // 2. Update in tour_details.json
  const tourDetails = readJson(TOUR_DETAILS_FILE) || {};
  let foundInDetails = false;
  for (const slug in tourDetails) {
    const t = tourDetails[slug];
    if (String(t.id) === String(id) || String(t.tourId) === String(id)) {
      t.coverImage = imageUrl;
      foundInDetails = true;
    }
  }
  if (foundInDetails) {
    writeJson(TOUR_DETAILS_FILE, tourDetails);
  }

  res.json({ status: 200, message: 'Image uploaded', data: imageUrl });
});

app.post('/api/admin/content/tours/:id/images/bulk', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });
  const fileUrls = req.files.map(f => isCloudinaryConfigured ? f.path : `/public/uploads/${f.filename}`);
  
  // Here, ideally we append to the tour gallery in tourDetails.
  const { id } = req.params;
  const tourDetails = readJson(TOUR_DETAILS_FILE) || {};
  let slugToUpdate = null;
  for (const slug in tourDetails) {
    const t = tourDetails[slug];
    if (String(t.id) === String(id) || String(t.tourId) === String(id)) {
      slugToUpdate = slug;
      break;
    }
  }

  if (slugToUpdate) {
    const existingImages = tourDetails[slugToUpdate].tourImages || [];
    tourDetails[slugToUpdate].tourImages = [...existingImages, ...fileUrls];
    writeJson(TOUR_DETAILS_FILE, tourDetails);
  }

  res.json({ status: 200, message: 'Images uploaded', data: { urls: fileUrls } });
});

// Global Error Handler for Multer/Cloudinary uploads
app.use((err, req, res, next) => {
  if (err) {
    console.error("Express Error Handler caught:", err);
    return res.status(400).json({ 
      status: 400, 
      message: err.message || "File upload failed. If Cloudinary is configured, please check your API keys." 
    });
  }
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
