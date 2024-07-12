const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/user');
const Place = require('./models/place');
const Booking = require('./models/booking');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookie = require('cookie');
const cookieParser = require('cookie-parser');                        //To read the cookie
const bcryptSalt = bcrypt.genSaltSync(10);                                                               // bcrypt.genSaltSync()  -->  bcrypt.hashSync()  -->  bcrypt.compareSync()
const jwtSecret = 'ghjkkjhgfghjk34567hbncnjhgvertyui7654vb';
const imageDownloader = require('image-downloader');  
const multer = require('multer');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();


const app = express();

app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(__dirname+'/uploads'));
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173'
}))

mongoose.connect("mongodb://0.0.0.0:27017/fsba")
    .then(() => console.log("connection successful"))
    .catch((err) => console.log(err));


app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({                                                            //User.create is an async function
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt)
        })
        res.json(userDoc);
    }
    catch (e) {
        res.status(422).json(e);
    }
})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email })
    if (userDoc) {
        const passOk = bcrypt.compareSync(password, userDoc.password)
        if (passOk) {
            const token = jwt.sign({email: userDoc.email, id: userDoc._id, name: userDoc.name}, jwtSecret)         //JWT for authentication
                res.cookie('token', token).json(userDoc);
        }       
        else {
            res.status(422).json("wrong password");
        }
    }
    else {
        res.json("user not found")
    }
})

app.get('/profile', (req,res)=>{
    const {token} = req.cookies;
    if(token){
        const user = jwt.verify(token, jwtSecret);
        res.json(user)
    }
})

app.post('/logout', (req, res)=>{
    res.cookie('token', '').json('true');
})

app.post('/uploadByLink', async(req, res)=>{
    const {link} = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image({
        url: link,
        dest: __dirname + '/uploads/' + newName
    });
    res.json(newName);
})

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'uploads');
        },
    filename: function(req, file, cb){
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + file.originalname);
    }
})

const photosMiddleware = multer({ storage: storage });
app.post('/upload', photosMiddleware.array('photos', 100),(req,res)=>{
    const uploadFiles = [];
    for(let i = 0; i<req.files.length; i++){
        const { path, originalname } = req.files[i];
        const parts = originalname.split('.');
        const ext = parts[parts.length-1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
        uploadFiles.push(newPath.replace('uploads',''));
        res.json(uploadFiles);
    }
})

app.post('/places', async(req, res)=>{
    const {token} = req.cookies;
    const { title, address, addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests, price } = req.body;
    if(token){
        const userData = jwt.verify(token, jwtSecret);
        const userDoc = await Place.create({   
            owner: userData.id,                                                         //User.create is an async function
            title, address, photos:addedPhotos, 
            description, perks, extraInfo, 
            checkIn, checkOut, maxGuests, price
        })
        res.json(userDoc);
    }
})

app.get('/user-places', async(req, res)=>{
    const {token} = req.cookies;
    if(token){
        const userData = jwt.verify(token, jwtSecret);
        res.json( await Place.find({owner:userData.id}) );
     }
})

app.get('/places', async (req, res)=>{
    res.json(await Place.find());
})

app.get('/viewplace/:id', async(req, res)=>{
    const {id} = req.params;  
    res.json( await Place.findById(id) );
})

app.delete('/deletePlace/:id', async(req, res)=>{
    const {id} = req.params;  
    const deletePlace = await Place.findByIdAndDelete(id);
    res.json("Place deleted");
})

app.post('/booking', async (req,res)=>{
    const {place, checkIn, checkOut, maxGuests, name, phone, price} = req.body;
    Booking.create({place, checkIn, checkOut, maxGuests, name, phone, price}).then(()=>{
        res.json("ok");
    })
})
app.listen(process.env.API_PORT);