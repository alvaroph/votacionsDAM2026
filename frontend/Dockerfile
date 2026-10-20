# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application's source code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
