import axios from 'axios';
import Movie from '../models/Movie.js';
import Show from '../models/Shows.js';

//API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res) => {
    try{
        const data = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
            headers: {
                Authorization: `Bearer ${process.env.TMDB_API_KEY}`
            }
        })
        const movies = data.data.results;
        res.json({success: true, movies: movies})
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message});
    }
};

// API to add a new movie to the database
export const addShow = async (req, res) => {
    try{
        const {movieId, showsInput, showPrice} = req.body;
        let movie = await Movie.findById(movieId);
        if(!movie){
            //Fetch movie details from TMDB API if not found in the database
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}`,
                    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
                ),
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`,
                    { headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` } }
                )
            ]);
            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

            const movieDetails = {
                _id: movieId,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres,
                casts: movieCreditsData.cast,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || '',
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime,
            };
            movie = await Movie.create(movieDetails);
        }
        const showsToCreate = [];
        showsInput.forEach(({ showDateTime }) => {
            showsToCreate.push({
                movie: movieId,
                showDateTime: new Date(showDateTime),
                showPrice: showPrice,
                occupiedSeats: {}
            });
        });
        if(showsToCreate.length > 0) {
            await Show.insertMany(showsToCreate);
            res.json({success: true, message: 'Shows added successfully'});
        } else {
            res.json({success: false, message: 'No shows to add'});
        }
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message});
    }
}

// API to get all shows from the database
export const getShows = async (req,res) =>{
    try{
        const shows = await Show.find({showDateTime: {$gte: new Date()}}).populate('movie').sort({showDateTime: 1});

        //filter unique shows
        const uniqueShows = new Set(shows.map(show => show.movie))
        res.json({success: true, shows: shows})
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message});
    }
}

// API to get a single show from the database
export const getShow = async (req, res) => {
    try{
        const {movieId} = req.params;
        
        // Get all upcoming shows for a movie
        const shows = await Show.find({movie: movieId, showDateTime : {$gte: new Date()}});
        const movie = await Movie.findById(movieId);
        
        // Check if movie exists
        if (!movie) {
            return res.json({success: false, message: 'Movie not found'});
        }
        
        const dateTime = {};
        
        // Process all shows and build the dateTime object
        shows.forEach((show) => {
            const date = show.showDateTime.toISOString().split('T')[0];
            if(!dateTime[date]){
                dateTime[date] = [];
            }
            dateTime[date].push({
                time: show.showDateTime, 
                showId: show._id
            });
        });
        
        // Send response only once, after processing all shows
        res.json({
            success: true,
            movie,
            dateTime
        });

    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message});
    }
}