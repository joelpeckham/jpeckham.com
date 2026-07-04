const posts = [];
const images = [
  '/lander/lander1.jpg',
  '/lander/lander2.jpg',
  '/lander/lander3.jpg',
  '/lander/lander4.jpg',
  '/lander/lander5.jpg',
  '/lander/lander6.jpg',
  '/lander/lander7.jpg',
  '/lander/lander8.jpg',
  '/lander/lander9.jpg',
  '/lander/lander10.jpg',
  '/lander/lander11.jpg',
  '/lander/lander12.jpg',
  '/lander/lander13.jpg',
  '/lander/lander14.jpg',
  '/lander/lander15.jpg',
  '/lander/lander16.jpg',
  '/lander/lander17.jpg',
  '/lander/lander18.jpg',
  '/lander/lander19.jpg',
  '/lander/lander20.jpg',
  '/lander/lander21.jpg',
  '/lander/lander22.jpg',
  '/lander/lander23.jpg',
  '/lander/lander24.jpg',
  '/lander/lander25.jpg',
  '/lander/lander26.jpg',
  '/lander/lander27.jpg',
  '/lander/lander28.jpg',
  '/lander/lander29.jpg',
];

let imageIndex = 0;

for (let i = 1; i <= 29; i++) {
  let item = {
    id: i,
    title: `Lander ${i}`,
    image: images[imageIndex],
  };
  posts.push(item);
  imageIndex++;
  if (imageIndex > images.length - 1) imageIndex = 0;
}
