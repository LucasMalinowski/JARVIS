# Use an official Ruby runtime as a parent image.
FROM ruby:3.2

# Install dependencies (build-essential for building gems with native extensions, PostgreSQL client, and Node.js)
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev curl nodejs npm

# Install JS bundlers globally if using esbuild or tailwind CLI
RUN npm install -g esbuild tailwindcss

# Set an environment variable to store where our code will live inside the image.
WORKDIR /app

# Copy the Gemfile and Gemfile.lock into the image.
COPY Gemfile Gemfile.lock ./

# Install gems.
RUN bundle install

# Copy package files and install JS dependencies (optional if using CLI only)
COPY package.json ./
RUN npm install

# Copy the rest of the application code.
COPY . .

# Expose port 3000 to be mapped to the host.
EXPOSE 3000

CMD ["bin/dev"]
