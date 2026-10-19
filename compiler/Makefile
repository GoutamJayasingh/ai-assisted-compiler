
CXX = g++
FLEX = flex
BISON = bison

CXXFLAGS = -std=c++17 -Wall -Wextra -Iinclude -Isrc

TARGET = compiler_app
PARSER_CPP = src/parser.cpp
PARSER_HPP = src/parser.hpp
LEXER_CPP = src/lex.yy.cpp
LOCATION_HPP = src/location.hh

SOURCES = src/main.cpp $(PARSER_CPP) $(LEXER_CPP) src/semantic.cpp
OBJECTS = $(SOURCES:.cpp=.o)

.PHONY: all clean run

all: $(TARGET)

$(PARSER_CPP) $(PARSER_HPP) &: src/parser.y include/ast.hpp include/semantic.hpp
	$(BISON) -Wall -d -o $(PARSER_CPP) --defines=$(PARSER_HPP) src/parser.y

$(LEXER_CPP): src/lexer.l $(PARSER_HPP)
	$(FLEX) -o $(LEXER_CPP) src/lexer.l

src/%.o: src/%.cpp $(PARSER_HPP)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(TARGET): $(OBJECTS)
	$(CXX) $(OBJECTS) -o $@

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET) $(OBJECTS) $(PARSER_CPP) $(PARSER_HPP) $(LEXER_CPP) $(LOCATION_HPP)
