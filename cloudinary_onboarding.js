const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: 'tcjeznvz', 
  api_key: '269132951846295', 
  api_secret: 'M9PImR0GkahurheLmiJtifTdBdg' 
});

async function run() {
  try {
    // 2. Upload an image
    console.log("Uploading image...");
    const uploadResult = await cloudinary.uploader.upload(
      "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", 
      { public_id: "sample_onboarding" }
    );
    console.log("Upload successful!");
    console.log("Secure URL:", uploadResult.secure_url);
    console.log("Public ID:", uploadResult.public_id);
    console.log("-----------------------------------------");

    // 3. Get image details
    console.log("Fetching image details...");
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log("Width:", details.width);
    console.log("Height:", details.height);
    console.log("Format:", details.format);
    console.log("File size (bytes):", details.bytes);
    console.log("-----------------------------------------");

    // 4. Transform the image
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto', // f_auto: Automatically delivers the image in the most optimal format for the user's browser.
      quality: 'auto'       // q_auto: Automatically adjusts the compression quality to minimize file size without visible degradation.
    });

    console.log("Done! Click link below to see optimized version of the image. Check the size and the format.");
    console.log(transformedUrl);

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();
