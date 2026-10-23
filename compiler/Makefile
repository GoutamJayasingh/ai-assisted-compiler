CXX = g++
FLEX = flex
BISON = bison

CXXFLAGS = -std=c++17 -Wall -Wextra -Iinclude -Isrc

TARGET = compiler_app
PARSER_CPP = src/parser.cpp
PARSER_HPP = src/parser.hpp
LEXER_CPP = src/lex.yy.cpp
LOCATION_HPP = src/location.hh
TRIANGULATION_TEST = tests/syntax_triangulation_test

SOURCES = src/main.cpp src/ast_printer.cpp src/ast_compare.cpp src/source_parser.cpp src/json_output.cpp $(PARSER_CPP) $(LEXER_CPP) src/semantic.cpp
OBJECTS = $(SOURCES:.cpp=.o)

.PHONY: all clean run test-triangulation

all: $(TARGET)

$(PARSER_CPP) $(PARSER_HPP) &: src/parser.y include/ast.hpp include/semantic.hpp
	$(BISON) -Wall -d -o $(PARSER_CPP) --defines=$(PARSER_HPP) src/parser.y

$(LEXER_CPP): src/lexer.l $(PARSER_HPP)
	$(FLEX) -o $(LEXER_CPP) src/lexer.l

src/%.o: src/%.cpp $(PARSER_HPP)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(TARGET): $(OBJECTS)
	$(CXX) $(OBJECTS) -o $@

$(TRIANGULATION_TEST): tests/syntax_triangulation_test.cpp include/syntax_triangulation.hpp include/lexer_buffer.hpp include/semantic.hpp
	$(CXX) $(CXXFLAGS) tests/syntax_triangulation_test.cpp -o $(TRIANGULATION_TEST)

test-triangulation: $(TRIANGULATION_TEST)
	./$(TRIANGULATION_TEST)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET) $(OBJECTS) $(PARSER_CPP) $(PARSER_HPP) $(LEXER_CPP) $(LOCATION_HPP) $(TRIANGULATION_TEST)
